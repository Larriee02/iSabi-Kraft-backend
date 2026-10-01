# iSabi-Kraft-backend
REST API for iSabiKraft, a trusted artisan marketplace for Nigeria. Handles auth, job posting, quotes, Paystack escrow payments, reviews, disputes and admin verification.
iSabiKraft Backend
The backend API for iSabiKraft, a two-sided service marketplace that helps customers in Nigeria find, assess, and hire reliable artisans, while giving skilled artisans access to serious customers, clearer job requirements, and protected payment.

Most customers already find artisans through referrals and WhatsApp. The real problem starts after the connection, uncertainty about reliability, pricing, and accountability on one side, and unclear scope, delayed payment, and no show customers on the other.
What this API does
Auth and users: registration and login for customers, artisans, and admins, with role-based access and terms acceptance
Artisan profiles: professional profiles with portfolios and verification.
Jobs and quotes: structured job requests with photos, location, and scope; artisans submit quotes, customers compare and accept
Payments and escrow: Paystack-powered payments with funds held in escrow until the customer confirms the job is done.
Job tracking: status flow from request through quote, booking, in progress, and completion
Reviews: ratings and reviews from completed platform jobs only, building each artisan's verified reputation
Disputes and admin: dispute handling, artisan approval, and marketplace monitoring
MVP scope
Built for a 6-week buildathon, launching in one Lagos corridor with three trade categories: electrical, carpentry, and cleaning services.
Project structure
src/
├── config/        # database, env, Paystack setup
├── controllers/   # request handlers
├── models/        # data models
├── routes/        # API routes
├── services/      # business logic (payment, escrow, terms, notifications)
├── middleware/    # auth, roles, error handling
└── utils/         # constants, reference generation, document hashing
Tech stack
Node.js, Express, Paystack (payments), Database ().
