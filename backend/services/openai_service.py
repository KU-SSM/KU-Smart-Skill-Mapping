import os
from openai import OpenAI
from dotenv import load_dotenv
import tempfile
from typing import Optional
import logging
import time

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
            
            try:
                # Upload file to OpenAI
                with open(temp_file_path, 'rb') as file:
                    uploaded_file = self.client.files.create(
                        file=file,
                        purpose='assistants'
                    )
                
                logger.info(f"File uploaded to OpenAI: {uploaded_file.id}")
                
            except Exception as e:
                # Clean up resources if they were created
                try:
                    if 'uploaded_file' in locals():
                        self.client.files.delete(uploaded_file.id)
                except Exception as cleanup_error:
                    logger.warning(f"Error during cleanup: {str(cleanup_error)}")
                raise e
                    
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            raise Exception(f"Error: Failed to extract text from PDF: {str(e)}")

# Create a singleton instance
_openai_service: Optional[OpenAIService] = None

def get_openai_service() -> OpenAIService:
    """Get or create OpenAI service instance."""
    global _openai_service
    if _openai_service is None:
        _openai_service = OpenAIService()
    return _openai_service
