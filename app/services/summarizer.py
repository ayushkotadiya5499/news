import re
from typing import List, Tuple
import logging

try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import sent_tokenize, word_tokenize
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False

try:
    from rake_nltk import Rake
    RAKE_AVAILABLE = True
except ImportError:
    RAKE_AVAILABLE = False

logger = logging.getLogger(__name__)


class TextSummarizer:
    """Service for summarizing articles and extracting keywords."""
    
    def __init__(self):
        self._ensure_nltk_data()
        self.stop_words = set()
        if NLTK_AVAILABLE:
            try:
                self.stop_words = set(stopwords.words('english'))
            except Exception:
                pass
    
    def _ensure_nltk_data(self):
        """Ensure required NLTK data is downloaded."""
        if not NLTK_AVAILABLE:
            return
            
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            try:
                nltk.download('punkt', quiet=True)
            except Exception:
                pass
                
        try:
            nltk.data.find('corpora/stopwords')
        except LookupError:
            try:
                nltk.download('stopwords', quiet=True)
            except Exception:
                pass
    
    def summarize(self, text: str, num_sentences: int = 3) -> str:
        """
        Generate a summary of the given text using extractive summarization.
        
        Args:
            text: The text to summarize
            num_sentences: Number of sentences in the summary
            
        Returns:
            Summary text
        """
        if not text or len(text.strip()) < 50:
            return text.strip() if text else ""
        
        # Clean the text
        text = self._clean_text(text)
        
        if not NLTK_AVAILABLE:
            # Fallback: return first few sentences
            sentences = text.split('.')
            summary_sentences = sentences[:num_sentences]
            return '. '.join(s.strip() for s in summary_sentences if s.strip()) + '.'
        
        try:
            # Tokenize into sentences
            sentences = sent_tokenize(text)
            
            if len(sentences) <= num_sentences:
                return text
            
            # Score sentences based on word frequency
            word_freq = self._get_word_frequencies(text)
            sentence_scores = []
            
            for i, sentence in enumerate(sentences):
                words = word_tokenize(sentence.lower())
                score = sum(word_freq.get(word, 0) for word in words if word.isalnum())
                # Boost earlier sentences slightly
                position_boost = 1.0 + (0.1 * (len(sentences) - i) / len(sentences))
                sentence_scores.append((i, sentence, score * position_boost))
            
            # Sort by score and get top sentences
            sentence_scores.sort(key=lambda x: x[2], reverse=True)
            top_sentences = sorted(sentence_scores[:num_sentences], key=lambda x: x[0])
            
            summary = ' '.join(s[1] for s in top_sentences)
            return summary
            
        except Exception as e:
            logger.error(f"Error summarizing text: {e}")
            # Fallback
            sentences = text.split('.')
            return '. '.join(s.strip() for s in sentences[:num_sentences] if s.strip()) + '.'
    
    def extract_keywords(self, text: str, num_keywords: int = 5) -> List[str]:
        """
        Extract keywords from the given text.
        
        Args:
            text: The text to extract keywords from
            num_keywords: Number of keywords to extract
            
        Returns:
            List of keywords
        """
        if not text or len(text.strip()) < 20:
            return []
        
        text = self._clean_text(text)
        
        # Try RAKE algorithm first
        if RAKE_AVAILABLE:
            try:
                rake = Rake(
                    min_length=1,
                    max_length=3,
                    include_repeated_phrases=False
                )
                rake.extract_keywords_from_text(text)
                keywords = rake.get_ranked_phrases()[:num_keywords * 2]
                
                # Filter and clean keywords
                cleaned_keywords = []
                for kw in keywords:
                    kw = kw.strip().lower()
                    if len(kw) >= 3 and len(kw.split()) <= 3:
                        cleaned_keywords.append(kw)
                        if len(cleaned_keywords) >= num_keywords:
                            break
                
                if cleaned_keywords:
                    return cleaned_keywords
            except Exception as e:
                logger.warning(f"RAKE extraction failed: {e}")
        
        # Fallback: frequency-based extraction
        return self._extract_keywords_by_frequency(text, num_keywords)
    
    def _extract_keywords_by_frequency(self, text: str, num_keywords: int) -> List[str]:
        """Extract keywords using word frequency analysis."""
        word_freq = self._get_word_frequencies(text)
        
        # Sort by frequency and get top words
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        
        keywords = []
        for word, _ in sorted_words:
            if len(word) >= 3 and word not in self.stop_words:
                keywords.append(word)
                if len(keywords) >= num_keywords:
                    break
        
        return keywords
    
    def _get_word_frequencies(self, text: str) -> dict:
        """Calculate word frequencies in the text."""
        word_freq = {}
        
        if NLTK_AVAILABLE:
            try:
                words = word_tokenize(text.lower())
            except Exception:
                words = text.lower().split()
        else:
            words = text.lower().split()
        
        for word in words:
            word = re.sub(r'[^\w]', '', word)
            if word and word not in self.stop_words and len(word) > 2:
                word_freq[word] = word_freq.get(word, 0) + 1
        
        return word_freq
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text."""
        # Remove URLs
        text = re.sub(r'http\S+|www.\S+', '', text)
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters but keep sentence punctuation
        text = re.sub(r'[^\w\s.,!?;:\'-]', '', text)
        return text.strip()
    
    def process_article(self, title: str, content: str) -> Tuple[str, List[str]]:
        """
        Process an article to generate summary and extract keywords.
        
        Args:
            title: Article title
            content: Article content
            
        Returns:
            Tuple of (summary, keywords)
        """
        # Combine title and content for better analysis
        full_text = f"{title}. {content}" if content else title
        
        summary = self.summarize(content or title, num_sentences=3)
        keywords = self.extract_keywords(full_text, num_keywords=5)
        
        return summary, keywords


# Singleton instance
summarizer = TextSummarizer()
