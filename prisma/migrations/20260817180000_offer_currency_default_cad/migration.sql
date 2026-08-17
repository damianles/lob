-- CAD-first defaults for new rows. Existing USD/CAD values are unchanged.
ALTER TABLE "Load" ALTER COLUMN "offerCurrency" SET DEFAULT 'CAD';
ALTER TABLE "LoadTemplate" ALTER COLUMN "defaultCurrency" SET DEFAULT 'CAD';
ALTER TABLE "LaneRateObservation" ALTER COLUMN "offerCurrency" SET DEFAULT 'CAD';
ALTER TABLE "Booking" ALTER COLUMN "agreedCurrency" SET DEFAULT 'CAD';
