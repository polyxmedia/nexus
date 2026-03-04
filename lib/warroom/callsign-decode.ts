// Military callsign prefix decoder
// Maps known callsign prefixes to unit designation and platform type

export interface CallsignInfo {
  unit: string;
  platform?: string;
  role?: string;
}

export const CALLSIGN_DECODE: Record<string, CallsignInfo> = {
  RCH:    { unit: "USAF Air Mobility Command", platform: "C-17 / C-5", role: "Strategic Airlift" },
  REACH:  { unit: "USAF Air Mobility Command", role: "Airlift" },
  RRR:    { unit: "Royal Air Force", role: "Multi-Role" },
  CNV:    { unit: "US Navy", role: "Fleet Logistics" },
  FORTE:  { unit: "USAF ISR", platform: "RQ-4 Global Hawk", role: "High-Altitude ISR" },
  JAKE:   { unit: "USAF ISR", platform: "RC-135 Rivet Joint", role: "Signals Intelligence" },
  NATO:   { unit: "NATO Allied Air Command", role: "Command & Control" },
  DUKE:   { unit: "USAF Special Operations", role: "Special Operations" },
  EVAC:   { unit: "Aeromedical Evacuation", role: "MEDEVAC" },
  CASA:   { unit: "Spanish Air Force (EdA)" },
  IAM:    { unit: "Italian Air Force (AMI)" },
  GAF:    { unit: "German Air Force (Luftwaffe)" },
  FAF:    { unit: "French Air Force (ALA)" },
  PLF:    { unit: "Polish Air Force" },
  TUAF:   { unit: "Turkish Air Force" },
  SHF:    { unit: "Swedish Air Force" },
  HRZ:    { unit: "Croatian Air Force" },
  BAF:    { unit: "Belgian Air Force" },
  HAF:    { unit: "Hellenic Air Force" },
  RFR:    { unit: "French Air Force (ALA)" },
  LAGR:   { unit: "USAF Aerial Refueling", platform: "KC-135 / KC-46", role: "Aerial Refueling" },
  NCHO:   { unit: "NATO AEW&C", platform: "E-3 Sentry AWACS", role: "Airborne Early Warning" },
  HOMER:  { unit: "US Navy Patrol", platform: "P-8A Poseidon", role: "Maritime Patrol / ASW" },
  TOPCAT: { unit: "US Navy Strategic Comms", platform: "E-6B Mercury", role: "TACAMO / Nuclear C3" },
  RETRO:  { unit: "USAF Test / Aggressor", role: "Adversary Training" },
  VIPER:  { unit: "USAF Fighter", platform: "F-16 Fighting Falcon", role: "Air Superiority / Strike" },
  EAGLE:  { unit: "USAF Fighter", platform: "F-15 Eagle", role: "Air Superiority" },
  HAWK:   { unit: "USAF ISR", role: "Intelligence Surveillance" },
  SLAM:   { unit: "US Navy Strike", platform: "F/A-18 Super Hornet", role: "Strike Fighter" },
  ROUGH:  { unit: "USAF Bomber", platform: "B-1B Lancer", role: "Strategic Bomber" },
  DEATH:  { unit: "USAF Bomber", platform: "B-52 Stratofortress", role: "Strategic Bomber" },
  GHOST:  { unit: "USAF Bomber", platform: "B-2 Spirit", role: "Stealth Bomber" },
  PACK:   { unit: "US Marine Corps", role: "Expeditionary" },
  INDIA:  { unit: "Indian Air Force" },
  CFC:    { unit: "Canadian Armed Forces" },
  ASY:    { unit: "Royal Australian Air Force" },
  QUID:   { unit: "RAF Tanker", platform: "A330 MRTT Voyager", role: "Aerial Refueling" },
  MMF:    { unit: "Multinational MRTT Fleet", platform: "A330 MRTT", role: "Aerial Refueling" },
  SPAR:   { unit: "USAF Special Air Mission", role: "VIP / Government Transport" },
  SAM:    { unit: "USAF Special Air Mission", role: "VIP / Government Transport" },
  EXEC:   { unit: "USAF Executive Airlift", role: "VIP Transport" },
  BOLT:   { unit: "USAF Fighter", platform: "F-35 Lightning II", role: "5th Gen Strike" },
  TABOR:  { unit: "Israeli Air Force (IAF)" },
};

export function decodeCallsign(callsign: string): CallsignInfo | null {
  const cs = callsign.trim().toUpperCase();
  for (const prefix of Object.keys(CALLSIGN_DECODE)) {
    if (cs.startsWith(prefix)) return CALLSIGN_DECODE[prefix];
  }
  return null;
}
