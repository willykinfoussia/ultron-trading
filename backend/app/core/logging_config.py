"""
Logging configuration for Ultron Trading application.
Provides structured logging with correlation IDs and flexible handlers.
"""

import logging
import logging.handlers
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

import pythonjsonlogger.jsonlogger
from pythonjsonlogger.jsonlogger import JsonFormatter


class CorrelationIdFilter(logging.Filter):
    """Add correlation ID to log records."""
    
    def filter(self, record: logging.LogRecord) -> bool:
        # Try to get correlation ID from context
        if not hasattr(record, 'correlation_id'):
            record.correlation_id = getattr(record, 'correlation_id', 'none')
        return True


class StructuredFormatter(JsonFormatter):
    """Custom JSON formatter with standard fields."""
    
    def add_fields(
        self,
        log_record: Dict[str, Any],
        record: logging.LogRecord,
        message_dict: Dict[str, Any],
    ) -> None:
        super().add_fields(log_record, record, message_dict)
        
        # Add timestamp in ISO format
        if not log_record.get('timestamp'):
            log_record['timestamp'] = datetime.utcnow().isoformat() + 'Z'
        
        # Add level name
        if log_record.get('level'):
            log_record['level'] = log_record['level'].upper()
        else:
            log_record['level'] = record.levelname
            
        # Add logger name
        if not log_record.get('logger'):
            log_record['logger'] = record.name
            
        # Add correlation ID if present
        if hasattr(record, 'correlation_id'):
            log_record['correlation_id'] = record.correlation_id


def setup_logging(
    log_level: str = "INFO",
    log_to_file: bool = True,
    log_file_path: str = "/home/opc/ultron-trading/backend.log",
    json_logs: bool = False,
    max_bytes: int = 10 * 1024 * 1024,  # 10 MB
    backup_count: int = 5,
) -> None:
    """
    Configure application logging.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_to_file: Whether to log to file
        log_file_path: Path to log file
        json_logs: Whether to use JSON formatting
        max_bytes: Max size per log file before rotation
        backup_count: Number of backup files to keep
    """
    # Get numeric log level
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    
    # Create formatter
    if json_logs:
        formatter = StructuredFormatter(
            '%(timestamp)s %(level)s %(logger)s %(correlation_id)s %(message)s'
        )
    else:
        formatter = logging.Formatter(
            '%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    
    # Create handlers
    handlers = []
    
    # Console handler (stdout)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(CorrelationIdFilter())
    handlers.append(console_handler)
    
    # File handler with rotation
    if log_to_file:
        # Ensure log directory exists
        log_path = Path(log_file_path)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.handlers.RotatingFileHandler(
            log_file_path,
            maxBytes=max_bytes,
            backupCount=backup_count,
        )
        file_handler.setFormatter(formatter)
        file_handler.addFilter(CorrelationIdFilter())
        handlers.append(file_handler)
    
    # Configure root logger
    logging.basicConfig(
        level=numeric_level,
        handlers=handlers,
        force=True,  # Override any existing configuration
    )
    
    # Set specific logger levels
    logging.getLogger("ultron-trading.analysis").setLevel(logging.DEBUG)
    logging.getLogger("ultron-trading.analysis.sentiment_scorer").setLevel(logging.DEBUG)
    logging.getLogger("ultron-trading.analysis.news_fetcher").setLevel(logging.DEBUG)
    logging.getLogger("httpx").setLevel(logging.WARNING)  # Reduce HTTP client noise
    logging.getLogger("yfinance").setLevel(logging.WARNING)  # Reduce yfinance noise
    
    # Log startup message
    logger = logging.getLogger("ultron-trading.logging")
    logger.info(
        "Logging configured",
        extra={
            "log_level": log_level,
            "json_logs": json_logs,
            "log_to_file": log_to_file,
            "log_file_path": log_file_path if log_to_file else None,
        }
    )


# Context variable for correlation ID
import contextvars

correlation_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar(
    "correlation_id", 
    default="none"
)


def get_correlation_id() -> str:
    """Get current correlation ID."""
    return correlation_id_ctx.get()


def set_correlation_id(cid: str) -> None:
    """Set correlation ID for current context."""
    correlation_id_ctx.set(cid)


def generate_correlation_id() -> str:
    """Generate a new correlation ID."""
    import uuid
    return str(uuid.uuid4())