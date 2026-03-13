-- Update subscription tier names and pricing
-- Observer $199/mo, Operator $599/mo, Institution (custom)

-- Rename Analyst -> Observer (if still named Analyst)
UPDATE subscription_tiers
SET name = 'Observer',
    price = 19900,
    features = '["Signal detection engine","Daily thesis generation","Market sentiment analysis","Prediction tracking with Brier scores","War Room with OSINT feeds","Calendar intelligence","Email alerts"]',
    updated_at = NOW()::text
WHERE LOWER(name) IN ('analyst', 'observer');

-- Update Operator pricing
UPDATE subscription_tiers
SET price = 59900,
    features = '["Everything in Observer","Game theory scenarios","Vessel tracking & dark fleet intel","Monte Carlo simulation","Prediction engine with full calibration","Portfolio risk analytics","GEX, BOCPD & regime detection","Short interest & options flow","On-chain analytics","Congressional trading signals"]',
    updated_at = NOW()::text
WHERE LOWER(name) = 'operator';

-- Rename Station -> Institution (if still named Station)
UPDATE subscription_tiers
SET name = 'Institution',
    price = 99900,
    features = '["Everything in Operator","API access","White-label briefings","PDF intelligence exports","Unlimited AI credits","Custom data integrations","Priority support"]',
    updated_at = NOW()::text
WHERE LOWER(name) IN ('station', 'institution');
