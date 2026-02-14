from importlib import metadata
import os
from openai import OpenAI
from dotenv import load_dotenv
import tempfile
from typing import Optional
import logging
import time
import asyncio
import pdfplumber
from pdf2image import convert_from_path
from PIL import Image
import pytesseract
import math
import json

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class OpenAIService:
    """Service for handling OpenAI API interactions, specifically for PDF text extraction."""
    
    def __init__(self):
        """Initialize OpenAI client with API key from environment variables."""
        api_key = os.getenv("OPENAI_API_KEY")
        logger.info(f"API Key: {api_key}") # DON'T FORGET TO REMOVE THIS
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables. Please set it in your .env file.")
        
        self.client = OpenAI(api_key=api_key)
        self.max_file_size = int(os.getenv("MAX_FILE_SIZE", 10485760))  # Default 10MB
        # Model for Assistants API - can be overridden via OPENAI_MODEL env variable
        # Default: "gpt-4o-mini" (free tier friendly)
        # Free tier options: "gpt-4o-mini", "gpt-3.5-turbo"
        # Paid tier options: "gpt-4o", "gpt-4-turbo-preview", "gpt-4"
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        logger.info(f"Initializing OpenAI service with model: {self.model}")
        
    def _ocr_from_pdf(self, pdf_path, dpi=300, lang="eng"):
        """Synchronous helper: convert PDF to images and run pytesseract."""
        texts = []
        # convert_from_path requires poppler in PATH
        images = convert_from_path(pdf_path, dpi=dpi)
        for img in images:
            # ensure PIL image
            if not isinstance(img, Image.Image):
                img = Image.fromarray(img)
            page_text = pytesseract.image_to_string(img, lang=lang)
            texts.append(page_text)
        return "\n\n".join(texts)
    
    async def extract_text_from_pdf(self, pdf_file) -> dict:
        """
        Extract text from PDF file using OpenAI's file processing API.
        
        Args:
            pdf_file: FastAPI UploadFile object containing the PDF
            
        Returns:
            dict: Contains 'text' (extracted text) and 'metadata' (file info)
            
        Raises:
            Exception: If PDF processing fails
        """
        try:
            # Read file content
            file_content = await pdf_file.read()
            file_size = len(file_content)
            
            # Validate file size
            if file_size > self.max_file_size:
                raise ValueError(f"File size ({file_size} bytes) exceeds maximum allowed size ({self.max_file_size} bytes)")
            
            if file_size == 0:
                raise ValueError("File is empty")
            
            logger.info(f"Processing PDF: {pdf_file.filename}, Size: {file_size} bytes")
            
            # Save file temporarily for OpenAI API
            with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
                temp_file.write(file_content)
                temp_file_path = temp_file.name
                
            # 1) Try pdfplumber extraction (fast, preserves layout)
            try:
                texts = []
                with pdfplumber.open(temp_file_path) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text() or ""
                        texts.append(page_text)
                full_text = "\n\n".join(texts).strip()
            except Exception as e:
                logger.warning(f"pdfplumber extraction failed: {e}")
                full_text = ""
                
            # 2) Evaluate quality: if too short or mostly whitespace, fallback to OCR
            quality_ok = len(full_text) > 100  # simple threshold; tune as needed
            if not quality_ok:
                logger.info("Low-quality text detected; running OCR fallback")
                ocr_text = await asyncio.to_thread(self._ocr_from_pdf, temp_file_path)
                # prefer OCR text if longer
                if len(ocr_text) > len(full_text):
                    full_text = ocr_text
                    
            if not full_text:
                raise Exception("Failed to extract text from PDF")

            metadata = {"filename": pdf_file.filename, "size": file_size}
            return {"text": full_text, "metadata": metadata}
            
            # try:
            #     # Upload file to OpenAI
            #     with open(temp_file_path, 'rb') as file:
            #         uploaded_file = self.client.files.create(
            #             file=file,
            #             purpose='assistants'
            #         )
                
            #     logger.info(f"File uploaded to OpenAI: {uploaded_file.id}")
                
            # except Exception as e:
            #     # Clean up resources if they were created
            #     try:
            #         if 'uploaded_file' in locals():
            #             self.client.files.delete(uploaded_file.id)
            #     except Exception as cleanup_error:
            #         logger.warning(f"Error during cleanup: {str(cleanup_error)}")
            #     raise e
                    
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            raise Exception(f"Error: Failed to extract text from PDF: {str(e)}")

    async def classify_text(self, text: str, task_prompt: str = None) -> dict:
        """
        Chunk text and call OpenAI to classify/extract skills and categories.
        Returns parsed JSON (or raw text if model returns text).
        """
        # Simple chunking by characters (adjust for tokens if needed)
        max_chunk_chars = 3000
        chunks = [text[i:i+max_chunk_chars] for i in range(0, len(text), max_chunk_chars)]
        results = []
        for i, chunk in enumerate(chunks):
            system_msg = {"role": "system", "content": "You are an assistant that extracts skills, categories and a short summary from resume/portfolio text. Return JSON."}
            user_content = (task_prompt or
                            "Extract a JSON object with keys: skills (array of strings), categories (array), summary (short string). "
                            "Only output valid JSON. Do not include extra commentary.\n\n"
                            f"Text:\n{chunk}")
            user_msg = {"role": "user", "content": user_content}

            # Use thread to call blocking client
            resp = await asyncio.to_thread(
                lambda: self.client.chat.completions.create(
                    model=self.model,
                    messages=[system_msg, user_msg],
                    temperature=0.0,
                    max_tokens=800
                )
            )
            # adapt to returned structure
            try:
                content = resp.choices[0].message["content"]
            except Exception:
                # fallback if different response shape
                content = getattr(resp, "content", str(resp))
            # Try parse JSON
            try:
                parsed = json.loads(content)
            except Exception:
                # If model returned plain text, keep raw
                parsed = {"raw": content}
            results.append(parsed)

        # Simple merge strategy: concatenate summaries and merge lists
        merged = {"skills": [], "categories": [], "summary": ""}
        for r in results:
            if isinstance(r, dict):
                merged["skills"].extend(r.get("skills", []))
                merged["categories"].extend(r.get("categories", []))
                if r.get("summary"):
                    merged["summary"] += (r.get("summary") + " ")
            else:
                merged["summary"] += (str(r) + " ")

        # Deduplicate lists
        merged["skills"] = list(dict.fromkeys([s.strip() for s in merged["skills"] if s]))
        merged["categories"] = list(dict.fromkeys([c.strip() for c in merged["categories"] if c]))
        merged["summary"] = merged["summary"].strip()
        return merged 

# Create a singleton instance
_openai_service: Optional[OpenAIService] = None

def get_openai_service() -> OpenAIService:
    """Get or create OpenAI service instance."""
    global _openai_service
    if _openai_service is None:
        _openai_service = OpenAIService()
    return _openai_service
