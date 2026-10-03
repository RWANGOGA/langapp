# Payment Tracking and Activity Logging Dashboard Specification

## 1. Purpose and Scope

This specification defines the upgrade of the existing Nile Language dashboard system to provide payment visibility, subscription lifecycle tracking, and payment-related activity logging for two roles:

- **Students:** View their own payment, package, subscription, renewal, and expiration information.
- **Administrators:** Monitor payment events, manage user payment/package records, and analyze revenue and subscription lifecycle metrics.

The design builds on the current FastAPI and Next.js architecture, including the existing `users`, `packages`, `orders`, `notifications`, `classes`, and admin dashboard surfaces. Payment providers remain external systems; card numbers, CVV values, and other sensitive payment credentials must never be stored by the application.

## 2. Goals and Non-Goals

### Goals

- Provide students with accurate, near-real-time billing status.
- Give administrators a complete, auditable record of payment activity.
- Make payment and subscription state queryable without scanning large order tables.
- Preserve role isolation: students see only their own records; administrators see authorized operational data.
- Support payment success, failure, refund, renewal, cancellation, and matching-pending states.
- Make webhook processing idempotent and auditable.

### Non-Goals

- Storing raw card data or implementing card processing inside the application.
- Replacing the external payment provider.
- Giving tutors control over student-facing prices.
- Allowing client-side amounts to determine order totals.

## 3. Functional Requirements

### 3.1 Student Dashboard Enhancements

#### Payment Summary component

The student dashboard shall include a `Payment Summary` component that displays the authenticated student's current billing state and recent payment history.

Required fields:

- **Payment status:** `Paid`, `Unpaid`, or `Overdue`.
- **Subscription commencement date:** The date the current package or subscription became active.
- **Subscription tier:** At minimum `Monthly` and `Annual`; the model may also support lesson bundles and one-time purchases.
- **Expiration date:** The date access ends if not renewed.
- **Renewal date:** The next scheduled charge or renewal date, when applicable.
- Current package name and subject/session entitlement.
- Amount, currency, and payment method label.
- Most recent successful payment date.
- Payment reference or receipt identifier, with sensitive provider values redacted.
- Matching state where relevant: `Assigned`, `Matching pending`, or `Not applicable`.

The component shall support these states:

1. **Active and paid:** Show active tier, start date, next renewal, expiration, and a positive status indicator.
2. **Unpaid:** Show the unpaid amount and a clear action to complete payment.
3. **Overdue:** Show the overdue date, amount, and renewal/payment action.
4. **Cancelled:** Show the cancellation date and the final access expiration date.
5. **Matching pending:** Explain that payment succeeded but tutor matching is still pending. This is not a failed payment state.
6. **No payment history:** Show a useful empty state with a link to select a learning session.

The student must never be able to view another student's orders, payment events, provider payloads, internal revenue, tutor payout, or admin notes.

#### Student payment history

The dashboard shall provide a paginated payment history list with:

- Date and time.
- Description/package.
- Payment status.
- Amount and currency.
- Payment method.
- Receipt or transaction reference.
- Link to a receipt view or downloadable receipt where supported.

The history shall be sorted newest first and use server-side pagination.

#### Student actions

Permitted actions include:

- Open the current payment or subscription details.
- Complete an unpaid payment.
- Renew an expiring subscription.
- Cancel a future renewal where provider support exists.
- View a receipt.
- Contact support for an overdue or matching-pending order.

Destructive actions must require confirmation and explain the effect on access and renewal.

### 3.2 Admin Dashboard Enhancements

#### Administrative Oversight Module

The admin dashboard shall include an `Administrative Oversight Module` containing three coordinated views:

1. **Payment Activity Log**
2. **User Payment and Package Management**
3. **Revenue and Subscription Analytics**

#### Payment Activity Log

The activity log shall record all payment-related events, including:

- Checkout session created.
- Payment initiated.
- Payment authorized.
- Payment succeeded.
- Payment failed.
- Payment expired.
- Payment refunded or partially refunded.
- Subscription created.
- Subscription renewed.
- Subscription renewal failed.
- Subscription cancelled.
- Subscription paused or resumed.
- Package changed.
- Webhook received, rejected, or replayed.
- Tutor matching completed.
- Tutor matching failed after successful payment.
- Manual admin correction or reassignment.

Each event shall include:

- Event ID.
- Event type.
- Event timestamp in UTC.
- Actor type and actor ID: student, administrator, provider, or system.
- Affected user ID and email, subject to privacy policy.
- Order, payment, and subscription IDs where applicable.
- Previous state and new state.
- Amount and currency where applicable.
- Provider and provider event ID where applicable.
- Correlation ID/request ID.
- Human-readable summary.
- Structured metadata with secrets and payment credentials removed.

The log shall support filtering by event type, status, user, order, payment provider, date range, currency, and correlation ID. It shall support full-text search over safe identifiers and summaries.

Activity records are append-only. Corrections must create a new compensating event rather than editing history.

#### Centralized user payment and package management

Administrators shall be able to search and inspect an individual user's payment state, including:

- User identity and role.
- Current package or subscription.
- Active, unpaid, overdue, cancelled, or expired state.
- Payment history.
- Renewal and expiration dates.
- Matching and tutor assignment status.
- Refund and cancellation history.
- Provider references, redacted as necessary.

Administrators may:

- Review payment details.
- Retry or resend a payment link where supported.
- Mark an operational matching case for review.
- Assign or reassign a tutor through an audited action.
- Initiate a refund through the provider integration, subject to permission.
- Cancel future renewal, subject to permission.

Administrators may not edit a settled amount directly. Financial corrections must use a provider refund, credit, adjustment, or a controlled accounting action with a reason.

#### Revenue and subscription analytics

The analytics dashboard shall expose high-level metrics with explicit calculation definitions:

- Gross revenue.
- Net revenue where fees are available.
- Successful payment count.
- Payment failure rate.
- Refund amount and refund rate.
- Active subscriptions.
- Monthly recurring revenue (MRR).
- Annual recurring revenue (ARR), if annual subscriptions are enabled.
- New subscriptions by period.
- Renewals by period.
- Cancellations and churn rate.
- Overdue balance.
- Average order value.
- Matching-pending orders.

Analytics must support daily, weekly, monthly, quarterly, and custom date ranges. All charts must show the selected timezone, currency, date range, and whether values are gross or net.

## 4. Technical Implementation Plan

### 4.1 Database Schema

The current `orders` table is the source of package purchase records. It should remain compatible with existing data while being extended or normalized into the following tables.

#### `pricing_catalog`

Centralizes student-facing price decisions. Tutors do not write to this table.

| Field | Type | Requirements |
|---|---|---|
| `id` | UUID/string | Primary key |
| `subject` | varchar | Indexed; for example `business_english` |
| `session_type` | varchar | Indexed; for example `conversation` |
| `duration_minutes` | integer | Positive value |
| `quantity` | integer | Number of sessions or billing units |
| `tier` | varchar | `monthly`, `annual`, `bundle`, or `one_time` |
| `currency` | varchar(3) | ISO currency code |
| `student_amount_minor` | bigint | Amount in minor currency units |
| `tutor_payout_minor` | bigint nullable | Internal payout, never student-editable |
| `platform_fee_minor` | bigint nullable | Internal accounting value |
| `version` | integer | Price version used by an order |
| `is_active` | boolean | Only active entries selectable |
| `effective_from` | timestamp | Price activation |
| `effective_until` | timestamp nullable | Optional end of validity |
| `created_at` | timestamp | Audit timestamp |
| `updated_at` | timestamp | Audit timestamp |

Indexes:

- `(subject, session_type, duration_minutes, is_active)`.
- `(tier, currency, is_active)`.
- `(effective_from, effective_until)` for historical price resolution.

#### `orders` modifications

Existing fields should be retained for backward compatibility, with the following additions:

| Field | Type | Requirements |
|---|---|---|
| `user_id` | integer | Non-null for new orders; foreign key to `users.id` |
| `pricing_catalog_id` | UUID/string nullable | Foreign key to selected catalog version |
| `subject` | varchar | Snapshot of the selected subject |
| `session_type` | varchar | Snapshot of the selected session type |
| `tier` | varchar | Snapshot of monthly/annual/bundle state |
| `currency` | varchar(3) | Settlement currency |
| `amount_minor` | bigint | Server-resolved amount |
| `payment_status` | enum | `pending`, `succeeded`, `failed`, `refunded`, `partially_refunded` |
| `fulfillment_status` | enum | `pending`, `matched`, `matching_pending`, `fulfilled`, `cancelled` |
| `idempotency_key` | varchar | Unique per user/payment attempt |
| `paid_at` | timestamp nullable | Provider-confirmed success |
| `fulfilled_at` | timestamp nullable | Fulfillment completion |
| `expires_at` | timestamp nullable | Payment/session expiry |
| `failure_code` | varchar nullable | Safe provider failure code |
| `failure_message` | text nullable | Safe user-facing message |

Indexes and constraints:

- Unique `(user_id, idempotency_key)`.
- Index `(user_id, created_at DESC)`.
- Index `(payment_status, created_at DESC)`.
- Index `(fulfillment_status, created_at DESC)`.
- Index `(currency, paid_at)`.
- Foreign key from `user_id` to `users.id`.

#### `payments`

Stores provider payment attempts independently from business orders.

| Field | Type | Requirements |
|---|---|---|
| `id` | UUID | Primary key |
| `order_id` | integer | Foreign key to `orders.id` |
| `provider` | varchar | Provider adapter name |
| `provider_payment_id` | varchar | Unique per provider |
| `method` | enum/varchar | `card`, `prepaid_card`, `line_pay`, `paypay`, `zalo_pay`, `momo`, `mobile_money`, `paypal` |
| `status` | enum | Provider-normalized state |
| `amount_minor` | bigint | Amount sent to provider |
| `currency` | varchar(3) | ISO currency |
| `prn` | varchar nullable | Provider/reference number, encrypted or access-controlled |
| `provider_created_at` | timestamp nullable | Provider timestamp |
| `paid_at` | timestamp nullable | Confirmed payment time |
| `failure_code` | varchar nullable | Safe error code |
| `failure_message` | text nullable | Safe message |
| `created_at` | timestamp | Audit timestamp |
| `updated_at` | timestamp | Audit timestamp |

Indexes:

- Unique `(provider, provider_payment_id)`.
- Index `(order_id, created_at DESC)`.
- Index `(status, created_at DESC)`.
- Index `(method, created_at DESC)`.

#### `subscriptions`

Represents the student's current subscription lifecycle independently from individual payments.

| Field | Type | Requirements |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | integer | Foreign key to `users.id` |
| `order_id` | integer | Originating order |
| `tier` | varchar | `monthly` or `annual` |
| `status` | enum | `active`, `past_due`, `cancelled`, `expired`, `paused` |
| `started_at` | timestamp | Commencement date |
| `current_period_start` | timestamp | Current billing period |
| `current_period_end` | timestamp | Expiration/access boundary |
| `next_renewal_at` | timestamp nullable | Next charge date |
| `cancelled_at` | timestamp nullable | Cancellation time |
| `provider_subscription_id` | varchar nullable | External subscription ID |
| `created_at` | timestamp | Audit timestamp |
| `updated_at` | timestamp | Audit timestamp |

Indexes:

- Unique active subscription constraint per user and product policy.
- `(user_id, status)`.
- `(status, next_renewal_at)` for renewal jobs.
- `(current_period_end, status)` for expiration jobs.

#### `payment_events`

Append-only audit log for payment and subscription events.

| Field | Type | Requirements |
|---|---|---|
| `id` | UUID | Primary key |
| `event_type` | varchar | Indexed event name |
| `actor_type` | varchar | `student`, `admin`, `provider`, `system` |
| `actor_id` | integer nullable | User or admin ID |
| `user_id` | integer nullable | Affected user |
| `order_id` | integer nullable | Related order |
| `payment_id` | UUID nullable | Related payment |
| `provider_event_id` | varchar nullable | Unique for webhook idempotency |
| `previous_state` | varchar nullable | State before event |
| `new_state` | varchar nullable | State after event |
| `amount_minor` | bigint nullable | Event amount |
| `currency` | varchar(3) nullable | Event currency |
| `summary` | varchar | Safe display text |
| `metadata` | JSONB | Redacted structured details |
| `correlation_id` | varchar | Request/workflow trace ID |
| `created_at` | timestamp | UTC event time |

Indexes:

- Unique `(provider_event_id)` where non-null.
- `(user_id, created_at DESC)`.
- `(order_id, created_at DESC)`.
- `(event_type, created_at DESC)`.
- `(created_at DESC)` for operational feeds.
- Optional GIN index on safe JSON metadata if search requirements justify it.

#### `student_tutor_assignments`

Replaces reliance on only `users.tutor_id` for assignment history.

| Field | Type | Requirements |
|---|---|---|
| `id` | UUID | Primary key |
| `student_id` | integer | Foreign key to `users.id` |
| `tutor_id` | integer | Foreign key to `users.id` |
| `order_id` | integer nullable | Originating paid order |
| `subject` | varchar | Assignment subject |
| `status` | enum | `active`, `ended`, `reassigned` |
| `assignment_reason` | varchar | Matching explanation |
| `assigned_at` | timestamp | Assignment time |
| `ended_at` | timestamp nullable | End time |

Constraints:

- At most one active assignment per student and subject, enforced with a partial unique index.
- Index `(tutor_id, status)` for tutor workload.
- Index `(student_id, status)` for student dashboard queries.

### 4.2 API Architecture

The existing REST API should remain the public contract. All endpoints use `/api/v1` and JSON. GraphQL is not required for this scope.

#### Authentication and RBAC

- Access tokens remain the authentication mechanism.
- The backend derives the user from the access token or secure session cookie.
- `student` scope: read/write only the authenticated student's checkout, payment, subscription, and receipt resources.
- `admin` scope: read operational payment data, analytics, and activity logs; perform audited refunds, cancellations, and assignments according to permission.
- `provider` is not an interactive user role; provider webhooks authenticate using signed headers or a dedicated webhook secret.
- Tutors do not receive access to student payment amounts, platform fees, or administrator activity logs.

#### Catalog endpoints

`GET /api/v1/pricing/catalog`

- Public or authenticated read, depending on product policy.
- Returns only active catalog entries and student-facing prices.

Response:

```json
{
  "items": [
    {
      "id": "business-english-60-monthly-v3",
      "subject": "Business English",
      "session_type": "conversation",
      "duration_minutes": 60,
      "quantity": 4,
      "tier": "monthly",
      "currency": "USD",
      "amount_minor": 10000,
      "version": 3
    }
  ]
}
```

#### Student checkout endpoints

`POST /api/v1/checkout/sessions`

Required scope: authenticated `student`.

Request:

```json
{
  "catalog_item_id": "business-english-60-monthly-v3",
  "payment_method": "card",
  "idempotency_key": "uuid-generated-by-client"
}
```

The server ignores any client-supplied amount, payout, fee, or user ID.

Response:

```json
{
  "order_id": 481,
  "payment_id": "payment-uuid",
  "status": "requires_payment",
  "amount_minor": 10000,
  "currency": "USD",
  "provider": "configured-provider",
  "checkout_url": "https://provider.example/checkout/...",
  "client_secret": null
}
```

`GET /api/v1/me/payments`

Required scope: authenticated `student`.

Query parameters:

- `status`.
- `from` and `to`.
- `cursor`.
- `limit`, maximum 100.

Response:

```json
{
  "items": [
    {
      "order_id": 481,
      "payment_id": "payment-uuid",
      "status": "succeeded",
      "description": "Business English - 4 sessions",
      "amount_minor": 10000,
      "currency": "USD",
      "method": "card",
      "paid_at": "2026-10-03T08:00:00Z",
      "receipt_url": "/api/v1/me/payments/payment-uuid/receipt"
    }
  ],
  "next_cursor": null
}
```

`GET /api/v1/me/payment-summary`

Required scope: authenticated `student`.

Response:

```json
{
  "status": "paid",
  "subscription": {
    "tier": "monthly",
    "started_at": "2026-10-03T08:00:00Z",
    "expires_at": "2026-11-03T08:00:00Z",
    "renews_at": "2026-11-03T08:00:00Z"
  },
  "current_order_id": 481,
  "fulfillment_status": "matched",
  "assigned_tutor": {
    "id": 9,
    "name": "Tutor Name"
  }
}
```

`POST /api/v1/me/subscriptions/{id}/cancel`

Required scope: authenticated `student`, limited to the student's own subscription. Creates an audit event and delegates cancellation to the provider.

#### Webhook endpoint

`POST /api/v1/payments/webhook`

Required authentication: provider signature verification, not student/admin RBAC.

The handler must:

1. Verify the signature.
2. Validate provider event ID.
3. Lock the related payment/order.
4. Ignore already-processed events.
5. Update payment and order state atomically.
6. Append a `payment_events` row.
7. Queue fulfillment only after verified success.
8. Return a successful response for safe duplicate delivery.

#### Admin endpoints

`GET /api/v1/admin/payments/activity`

Required scope: `admin:payments:read`.

Filters:

- `event_type`.
- `status`.
- `user_id`.
- `order_id`.
- `provider`.
- `from` and `to`.
- `cursor` and `limit`.

`GET /api/v1/admin/users/{user_id}/payments`

Required scope: `admin:users:payments:read`.

Returns payment history, current package/subscription, fulfillment state, and safe provider references.

`GET /api/v1/admin/analytics/payments`

Required scope: `admin:analytics:read`.

Query parameters:

- `from`.
- `to`.
- `group_by`: `day`, `week`, or `month`.
- `currency`.

Response:

```json
{
  "period": { "from": "2026-10-01", "to": "2026-10-31", "timezone": "UTC" },
  "currency": "USD",
  "summary": {
    "gross_revenue_minor": 1250000,
    "successful_payments": 84,
    "failed_payments": 6,
    "refunds_minor": 50000,
    "active_subscriptions": 312,
    "matching_pending": 4
  },
  "series": [
    { "date": "2026-10-03", "gross_revenue_minor": 100000, "successful_payments": 7, "renewals": 2, "cancellations": 1 }
  ]
}
```

`POST /api/v1/admin/users/{user_id}/assignments`

Required scope: `admin:matching:write`.

Manual assignment must use the same matching/assignment service as automated fulfillment and create an audit event.

`POST /api/v1/admin/payments/{payment_id}/refund`

Required scope: `admin:payments:refund`.

Requires an idempotency key and a reason. The provider remains the source of truth for settlement.

### 4.3 Payment Provider Architecture

Use a provider adapter interface:

```python
class PaymentProvider:
    async def create_checkout(self, order, method): ...
    async def verify_webhook(self, headers, body): ...
    async def refund(self, payment, amount_minor=None): ...
    async def cancel_subscription(self, subscription): ...
```

Provider-specific adapters may support:

- Card entry using hosted checkout or tokenized fields.
- Prepaid cards through the card provider.
- LINE Pay and PayPay for Japan.
- ZaloPay and MoMo for Vietnam.
- Regional Mobile Money adapters where a supported provider is configured.
- Provider-specific PRN/reference number generation.

The application shall never receive raw PAN or CVV values. Provider API keys belong in secret management, not source control or client bundles.

### 4.4 Fulfillment and Matching

The verified-payment workflow shall be:

1. Mark payment as succeeded.
2. Mark order as paid.
3. Resolve the student from the authenticated order owner.
4. Acquire a row lock for the student and order.
5. Check whether an active assignment already exists.
6. Select one eligible tutor using subject, language, proficiency, availability, approval, active status, and workload.
7. Create one active assignment.
8. Create the student entitlement/subscription.
9. Create notifications for student, tutor, and administrators.
10. Append activity events.
11. Publish an admin update event.

If no tutor is available:

- Payment remains `succeeded`.
- Order fulfillment becomes `matching_pending`.
- The student receives a matching-pending notification.
- Administrators receive a `matching_failed` activity event and notification.
- A retry job may attempt matching later.
- The system must not silently refund or mark payment failed.

### 4.5 UI/UX Design Specifications

#### Student components

Recommended component tree:

```text
StudentDashboard
  PaymentSummary
    PaymentStatusBadge
    SubscriptionDates
    TierCard
    RenewalAction
  PaymentHistory
  MatchingStatus
```

Design principles:

- Use one primary status color and a text label; never rely on color alone.
- Show amount, currency, and date together.
- Use a compact status card at the top of the dashboard.
- Use progressive disclosure for provider references and transaction details.
- Provide clear actions for unpaid, overdue, renewal, and matching-pending states.
- Keep empty states informative and actionable.
- Avoid exposing internal payout or fee information.

#### Administrator components

Recommended component tree:

```text
AdminOversight
  RevenueSummary
  SubscriptionLifecycleChart
  PaymentActivityFilters
  PaymentActivityTable
  UserPaymentDrawer
  PaymentDetailTimeline
  MatchingPendingQueue
```

Design principles:

- Optimize for scanning and comparison rather than decorative presentation.
- Use dense tables with sticky headers, sortable columns, pagination, and column visibility controls.
- Keep filters persistent while moving between user, order, and event detail.
- Use a timeline for one user's payment/subscription lifecycle.
- Use charts for trends, not for exact values; show exact values in adjacent tables or tooltips.
- Display data freshness and last updated timestamp.
- Make currency and timezone explicit.
- Distinguish gross, net, refunds, and overdue balances.
- Provide export only to authorized administrators and log every export.

#### Accessibility requirements

- Target WCAG 2.2 AA.
- All status indicators include text labels and accessible names.
- Charts provide tabular equivalents and summaries.
- Tables use semantic headers, `aria-sort`, and keyboard navigation where applicable.
- All dialogs trap focus and return focus to the invoking control.
- Inputs have persistent labels, error descriptions, and sufficient focus contrast.
- Do not use emoji as the only meaning-bearing iconography.
- Maintain a minimum 4.5:1 contrast ratio for normal text and 3:1 for large text/UI boundaries.
- Ensure responsive layouts work at 320px wide without horizontal scrolling except for intentionally scrollable data tables.
- Respect reduced-motion preferences.

## 5. Security, Reliability, and Observability

- Verify all provider webhooks cryptographically.
- Use idempotency keys for checkout creation, webhook processing, refunds, and admin mutations.
- Encrypt or strongly restrict access to PRNs and provider payloads.
- Redact card data, authorization headers, secrets, and raw provider credentials from logs.
- Use UTC timestamps in storage and convert to the user's display timezone in the UI.
- Add correlation IDs to checkout, webhook, fulfillment, and admin requests.
- Emit metrics for payment success/failure, webhook latency, matching success, matching-pending backlog, and fulfillment errors.
- Retry provider calls with bounded exponential backoff.
- Send failed fulfillment jobs to a dead-letter or manual review queue.
- Never retry a payment charge blindly; only retry provider operations that are explicitly idempotent.

## 6. Testing Strategy

### Unit tests

- Price catalog resolution.
- Student/admin authorization checks.
- Payment state transitions.
- Webhook signature verification.
- Duplicate webhook handling.
- Matching eligibility and deterministic tie-breaking.
- Exactly-one-active-assignment constraint.
- Matching-pending notification creation.
- Analytics aggregation.

### Integration tests

- Authenticated checkout creates an order for the current user.
- Client-supplied amount is ignored or rejected.
- Unauthenticated checkout returns `401`.
- Student cannot read another user's order.
- Successful webhook marks payment succeeded and assigns one tutor.
- Successful payment with no eligible tutor creates matching-pending state and admin notification.
- Replayed webhook does not duplicate assignments or notifications.
- Refund updates payment, order, subscription, and activity state.

### End-to-end tests

- Logged-in student selects subject, session type, and package without seeing registration.
- New visitor signs in and returns to the preserved checkout selection.
- Payment provider redirect/webhook completes the order.
- Student sees updated payment summary.
- Admin sees the payment event and matching result.

## 7. Rollout Plan

1. Add schema migrations and backfill existing orders into payment/subscription states.
2. Add read-only student payment summary and admin activity APIs.
3. Add centralized catalog resolution and stop trusting client amounts.
4. Enable authenticated checkout with a sandbox payment provider.
5. Enable webhook processing and idempotent fulfillment.
6. Enable automatic matching and matching-pending notifications.
7. Enable admin analytics and real-time/polling updates.
8. Run a controlled production pilot with one currency and one provider.
9. Expand Far East Asian wallet and mobile money adapters after provider certification.
10. Remove legacy mock checkout paths and hardcoded frontend package prices.

## 8. Acceptance Criteria

The upgrade is complete when:

- A logged-in student reaches checkout without a registration prompt.
- The server determines the order owner and price.
- A student sees Paid, Unpaid, or Overdue status with subscription dates and tier.
- Card and configured Far East Asian wallet/mobile methods use provider-hosted or tokenized payment flows.
- A verified successful payment creates exactly one active tutor assignment when an eligible tutor exists.
- A successful payment with no eligible tutor remains financially successful, is marked matching-pending, and notifies administrators.
- Administrators can search payment activity by user, order, event, provider, and date.
- Revenue and subscription lifecycle metrics are available with defined currency and timezone.
- Duplicate webhook delivery does not duplicate money movement, assignments, or notifications.
- Students cannot access another student's payment or subscription data.
- All payment and administrative mutations are auditable.
