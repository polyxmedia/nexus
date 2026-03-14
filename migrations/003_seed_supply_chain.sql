-- Seed supply chain edges
-- Generated from lib/supply-chain/seed.ts
-- Columns: from_entity, to_entity, relationship_type, strength, lag_days, source, confidence, evidence, created_at

INSERT INTO supply_chain_edges (from_entity, to_entity, relationship_type, strength, lag_days, source, confidence, evidence, created_at) VALUES
  -- Semiconductors
  ('TSMC', 'AAPL', 'supplier', 0.9, 0, 'seed', 0.95, 'TSMC fabricates Apple''s A-series and M-series chips', now()),
  ('TSMC', 'NVDA', 'supplier', 0.85, 0, 'seed', 0.95, 'TSMC manufactures all NVIDIA GPUs', now()),
  ('TSMC', 'AMD', 'supplier', 0.8, 0, 'seed', 0.95, 'TSMC fabricates AMD Ryzen and EPYC processors', now()),
  ('TSMC', 'QCOM', 'supplier', 0.75, 0, 'seed', 0.95, 'TSMC manufactures Qualcomm Snapdragon chips', now()),
  ('TSMC', 'AVGO', 'supplier', 0.7, 0, 'seed', 0.95, 'TSMC fabricates Broadcom networking chips', now()),
  ('ASML', 'TSMC', 'supplier', 0.95, 0, 'seed', 0.95, 'ASML is sole supplier of EUV lithography machines', now()),
  ('ASML', 'INTC', 'supplier', 0.8, 0, 'seed', 0.95, 'ASML supplies Intel with lithography equipment', now()),
  ('ASML', 'SAMSUNG', 'supplier', 0.8, 0, 'seed', 0.95, 'ASML supplies Samsung foundry', now()),
  ('LRCX', 'TSMC', 'supplier', 0.65, 0, 'seed', 0.95, 'Lam Research supplies etch and deposition equipment', now()),

  -- Consumer Tech
  ('AAPL', 'FOXCONN', 'customer', 0.85, 0, 'seed', 0.95, 'Foxconn assembles majority of iPhones', now()),
  ('AAPL', 'CRUS', 'customer', 0.7, 0, 'seed', 0.95, 'Cirrus Logic supplies audio chips for iPhones', now()),
  ('MSFT', 'NVDA', 'customer', 0.6, 0, 'seed', 0.95, 'Microsoft Azure is major NVIDIA GPU customer for AI', now()),
  ('GOOG', 'NVDA', 'customer', 0.55, 0, 'seed', 0.95, 'Google Cloud uses NVIDIA GPUs for AI workloads', now()),

  -- Energy
  ('SAUDI ARAMCO', 'CL', 'supplier', 0.95, 0, 'seed', 0.95, 'World''s largest oil producer, ~12% of global supply', now()),
  ('CL', 'XOM', 'input', 0.9, 0, 'seed', 0.95, 'ExxonMobil revenue directly tied to crude prices', now()),
  ('CL', 'CVX', 'input', 0.85, 0, 'seed', 0.95, 'Chevron upstream earnings scale with crude', now()),
  ('CL', 'VLO', 'input', 0.7, 0, 'seed', 0.95, 'Valero refining margins depend on crude cost', now()),
  ('NG', 'LNG', 'input', 0.8, 0, 'seed', 0.95, 'Cheniere profits from LNG export margins', now()),
  ('CL', 'JETS', 'input', 0.75, 0, 'seed', 0.95, 'Jet fuel is 25-35% of airline operating costs', now()),

  -- Defense
  ('GE', 'BA', 'supplier', 0.7, 0, 'seed', 0.95, 'GE Aviation supplies engines for Boeing aircraft', now()),
  ('RTX', 'LMT', 'competitor', 0.6, 0, 'seed', 0.95, 'Raytheon and Lockheed compete for defense contracts', now()),
  ('BA', 'SPR', 'customer', 0.8, 0, 'seed', 0.95, 'Spirit AeroSystems makes Boeing fuselages', now()),

  -- Automotive
  ('TSLA', 'PANA', 'customer', 0.65, 0, 'seed', 0.95, 'Panasonic supplies battery cells for Tesla', now()),
  ('TSLA', 'ALB', 'customer', 0.5, 0, 'seed', 0.95, 'Albemarle supplies lithium for Tesla batteries', now()),
  ('ALB', 'LIT', 'input', 0.7, 0, 'seed', 0.95, 'Lithium supply directly affects EV battery costs', now()),

  -- Mining & Commodities
  ('BHP', 'FE', 'supplier', 0.7, 0, 'seed', 0.95, 'BHP is world''s largest iron ore producer', now()),
  ('RIO', 'FE', 'supplier', 0.65, 0, 'seed', 0.95, 'Rio Tinto is major iron ore supplier', now()),
  ('FCX', 'COPX', 'supplier', 0.75, 0, 'seed', 0.95, 'Freeport-McMoRan is world''s largest public copper producer', now()),
  ('NEM', 'GLD', 'supplier', 0.7, 0, 'seed', 0.95, 'Newmont is world''s largest gold miner', now()),

  -- Pharma
  ('LONZA', 'MRNA', 'supplier', 0.7, 0, 'seed', 0.95, 'Lonza manufactures mRNA for Moderna vaccines', now()),
  ('TMO', 'PFE', 'supplier', 0.5, 0, 'seed', 0.95, 'Thermo Fisher supplies lab equipment and reagents', now()),

  -- Shipping & Logistics
  ('MAERSK', 'BDRY', 'supplier', 0.8, 0, 'seed', 0.95, 'Maersk is world''s largest container shipping company', now()),
  ('UPS', 'AMZN', 'supplier', 0.6, 0, 'seed', 0.95, 'UPS handles significant Amazon last-mile delivery', now()),

  -- Geopolitical nodes
  ('HORMUZ', 'CL', 'logistics', 0.95, 0, 'seed', 0.95, '21% of global oil transits Strait of Hormuz', now()),
  ('HORMUZ', 'NG', 'logistics', 0.8, 0, 'seed', 0.95, 'Qatar LNG exports transit Hormuz', now()),
  ('SUEZ', 'BDRY', 'logistics', 0.85, 0, 'seed', 0.95, '12% of global trade transits Suez Canal', now()),
  ('MALACCA', 'CL', 'logistics', 0.7, 0, 'seed', 0.95, '25% of global oil transits Strait of Malacca', now());
