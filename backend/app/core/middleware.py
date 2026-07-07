"""
Correlation ID middleware for request tracing.
"""

import uuid
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.logging_config import set_correlation_id, generate_correlation_id


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Middleware to add correlation ID to requests and logs."""
    
    def __init__(
        self,
        app: ASGIApp,
        header_name: str = "X-Request-ID",
        update_request_header: bool = True,
    ):
        super().__init__(app)
        self.header_name = header_name
        self.update_request_header = update_request_header
    
    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        # Generate or extract correlation ID
        correlation_id = (
            request.headers.get(self.header_name) 
            or str(uuid.uuid4())
        )
        
        # Set in context for logging
        set_correlation_id(correlation_id)
        
        # Add to request state for access in endpoints
        request.state.correlation_id = correlation_id
        
        # Process request
        response = await call_next(request)
        
        # Add correlation ID to response headers
        response.headers[self.header_name] = correlation_id
        
        return response