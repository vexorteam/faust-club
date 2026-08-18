"""Everything a router must not know about: ordering, photos, the webhook.

A router speaks schemas and calls a service; it never opens Pillow and never
writes SQL by hand. Replacing the photo storage or the database has to stay a
change to one service, the way `lib/api.ts` is the one file the frontend
changes to replace its backend.
"""
