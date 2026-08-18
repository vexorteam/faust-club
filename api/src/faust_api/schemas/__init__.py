"""Pydantic models of the responses. The shape is the contract, §5.3 and §5.3.1.

The frontend validates every answer with its own Zod schemas and treats a
mismatch as "the backend is down", so these models are not documentation — they
are the contract itself. A field renamed here disappears from the showcase.
"""
