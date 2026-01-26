"""
Services package for handling external API integrations.
Provides OpenAI service for PDF text extraction.
"""

# Import main service functions for easy access
# This allows: from services import get_openai_service
# Instead of: from services.openai_service import get_openai_service
from .openai_service import get_openai_service, OpenAIService

# Define what gets imported with "from services import *"
__all__ = [
    'get_openai_service',
    'OpenAIService',
]
