-- Preserve an existing Basic chain entitlement when a later Stripe subscription
-- event does not carry a valid entitled_chain value. A tier change to Pro is
-- intentionally unaffected so Pro subscriptions can continue to store NULL.

CREATE OR REPLACE FUNCTION preserve_basic_entitled_chain()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tier = 'basic'
     AND OLD.tier = 'basic'
     AND NEW.entitled_chain IS NULL
     AND OLD.entitled_chain IS NOT NULL THEN
    NEW.entitled_chain := OLD.entitled_chain;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscriptions_preserve_basic_entitled_chain
ON subscriptions;

CREATE TRIGGER subscriptions_preserve_basic_entitled_chain
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION preserve_basic_entitled_chain();
