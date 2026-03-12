// Shared vessel generation logic used by war room API and shipping watchlist
import type { VesselState, VesselType } from "./types";

interface SeedVessel {
  mmsi: string;
  name: string;
  baseLat: number;
  baseLng: number;
  speed: number;
  course: number;
  vesselType: VesselType;
  flag: string;
  destination: string;
}

const MILITARY_FLAGS = ["US Navy", "RU Navy", "CN Navy", "IR Navy"];

function isMilitaryFlag(flag: string): boolean {
  return MILITARY_FLAGS.includes(flag);
}

export const SEED_VESSELS: SeedVessel[] = [
  // -- Strait of Hormuz --
  { mmsi: "211000001", name: "NORDIC VOYAGER", baseLat: 26.56, baseLng: 56.25, speed: 12.4, course: 135, vesselType: "tanker", flag: "NO", destination: "FUJAIRAH" },
  { mmsi: "211000002", name: "GULF SPIRIT", baseLat: 26.48, baseLng: 56.40, speed: 10.8, course: 310, vesselType: "tanker", flag: "SA", destination: "RAS TANURA" },
  { mmsi: "211000003", name: "USS BATAAN", baseLat: 26.35, baseLng: 56.10, speed: 15.2, course: 90, vesselType: "military", flag: "US Navy", destination: "PATROL" },
  { mmsi: "211000004", name: "IRAN HORMUZ", baseLat: 26.62, baseLng: 56.55, speed: 8.0, course: 270, vesselType: "military", flag: "IR Navy", destination: "BANDAR ABBAS" },
  { mmsi: "211000005", name: "PACIFIC MERCHANT", baseLat: 26.30, baseLng: 56.70, speed: 14.1, course: 120, vesselType: "cargo", flag: "PA", destination: "MUMBAI" },
  { mmsi: "211000006", name: "ARABIAN DAWN", baseLat: 26.70, baseLng: 56.00, speed: 11.5, course: 160, vesselType: "tanker", flag: "AE", destination: "JEBEL ALI" },
  // -- Suez Canal / Red Sea --
  { mmsi: "212000001", name: "MAERSK SEALAND", baseLat: 30.45, baseLng: 32.35, speed: 8.0, course: 170, vesselType: "cargo", flag: "DK", destination: "JEDDAH" },
  { mmsi: "212000002", name: "EVER GIVEN II", baseLat: 30.20, baseLng: 32.34, speed: 7.5, course: 350, vesselType: "cargo", flag: "TW", destination: "ROTTERDAM" },
  { mmsi: "212000003", name: "SUEZ TANKER", baseLat: 29.95, baseLng: 32.56, speed: 9.2, course: 180, vesselType: "tanker", flag: "GR", destination: "YANBU" },
  { mmsi: "212000004", name: "QUEEN MARY III", baseLat: 30.60, baseLng: 32.30, speed: 11.0, course: 170, vesselType: "passenger", flag: "GB", destination: "AQABA" },
  { mmsi: "212000005", name: "ITS CAVOUR", baseLat: 30.10, baseLng: 32.50, speed: 16.0, course: 180, vesselType: "military", flag: "US Navy", destination: "DJIBOUTI" },
  // -- Bab el-Mandeb --
  { mmsi: "213000001", name: "STENA BULK", baseLat: 12.60, baseLng: 43.30, speed: 13.5, course: 340, vesselType: "tanker", flag: "SE", destination: "SUEZ" },
  { mmsi: "213000002", name: "MSC OSCAR", baseLat: 12.45, baseLng: 43.45, speed: 14.0, course: 160, vesselType: "cargo", flag: "CH", destination: "SINGAPORE" },
  { mmsi: "213000003", name: "RFS MARSHAL SHAPOSHNIKOV", baseLat: 12.55, baseLng: 43.20, speed: 18.0, course: 200, vesselType: "military", flag: "RU Navy", destination: "PATROL" },
  { mmsi: "213000004", name: "YEMEN FISHER", baseLat: 12.70, baseLng: 43.60, speed: 4.5, course: 45, vesselType: "fishing", flag: "YE", destination: "ADEN" },
  { mmsi: "213000005", name: "RED SEA CARRIER", baseLat: 12.35, baseLng: 43.35, speed: 12.0, course: 330, vesselType: "cargo", flag: "SG", destination: "PORT SAID" },
  // -- South China Sea --
  { mmsi: "214000001", name: "COSCO SHIPPING STAR", baseLat: 14.50, baseLng: 114.30, speed: 16.2, course: 45, vesselType: "cargo", flag: "CN", destination: "SHANGHAI" },
  { mmsi: "214000002", name: "CNS LIAONING", baseLat: 15.20, baseLng: 113.80, speed: 20.0, course: 180, vesselType: "military", flag: "CN Navy", destination: "PATROL" },
  { mmsi: "214000003", name: "PHILIPPINE STAR", baseLat: 13.80, baseLng: 115.20, speed: 10.5, course: 270, vesselType: "cargo", flag: "PH", destination: "MANILA" },
  { mmsi: "214000004", name: "MEKONG FISHERY", baseLat: 11.20, baseLng: 112.00, speed: 5.0, course: 90, vesselType: "fishing", flag: "VN", destination: "DA NANG" },
  { mmsi: "214000005", name: "USS RONALD REAGAN", baseLat: 15.00, baseLng: 115.50, speed: 22.0, course: 320, vesselType: "military", flag: "US Navy", destination: "PATROL" },
  { mmsi: "214000006", name: "ORIENT TRADER", baseLat: 12.50, baseLng: 113.00, speed: 13.8, course: 60, vesselType: "cargo", flag: "MY", destination: "HONG KONG" },
  { mmsi: "214000007", name: "JADE TANKER", baseLat: 14.00, baseLng: 116.00, speed: 11.0, course: 210, vesselType: "tanker", flag: "JP", destination: "SINGAPORE" },
  // -- Taiwan Strait --
  { mmsi: "215000001", name: "YANG MING UNITY", baseLat: 24.50, baseLng: 119.50, speed: 15.0, course: 20, vesselType: "cargo", flag: "TW", destination: "KAOHSIUNG" },
  { mmsi: "215000002", name: "CNS SHANDONG", baseLat: 24.80, baseLng: 119.00, speed: 18.5, course: 180, vesselType: "military", flag: "CN Navy", destination: "PATROL" },
  { mmsi: "215000003", name: "EVERGREEN HARMONY", baseLat: 25.00, baseLng: 120.00, speed: 14.0, course: 200, vesselType: "cargo", flag: "TW", destination: "XIAMEN" },
  { mmsi: "215000004", name: "FUZHOU FISHER", baseLat: 25.30, baseLng: 119.80, speed: 3.5, course: 90, vesselType: "fishing", flag: "CN", destination: "FUZHOU" },
  { mmsi: "215000005", name: "PACIFIC SPIRIT", baseLat: 24.20, baseLng: 119.30, speed: 12.0, course: 10, vesselType: "tanker", flag: "KR", destination: "BUSAN" },
  // -- Mediterranean --
  { mmsi: "216000001", name: "CMA CGM ANTOINE", baseLat: 35.80, baseLng: 14.50, speed: 18.0, course: 270, vesselType: "cargo", flag: "FR", destination: "MARSEILLE" },
  { mmsi: "216000002", name: "MEIN SCHIFF 7", baseLat: 36.20, baseLng: 16.00, speed: 16.5, course: 90, vesselType: "passenger", flag: "MT", destination: "PIRAEUS" },
  { mmsi: "216000003", name: "FS CHARLES DE GAULLE", baseLat: 35.50, baseLng: 18.00, speed: 20.0, course: 90, vesselType: "military", flag: "US Navy", destination: "PATROL" },
  { mmsi: "216000004", name: "AEGEAN TANKER", baseLat: 34.80, baseLng: 24.50, speed: 11.0, course: 300, vesselType: "tanker", flag: "GR", destination: "AUGUSTA" },
  { mmsi: "216000005", name: "RFS ADMIRAL KUZNETSOV", baseLat: 35.00, baseLng: 20.00, speed: 14.0, course: 270, vesselType: "military", flag: "RU Navy", destination: "TARTUS" },
  { mmsi: "216000006", name: "MEDITERRANEAN FISHER", baseLat: 36.50, baseLng: 12.00, speed: 4.0, course: 180, vesselType: "fishing", flag: "IT", destination: "LAMPEDUSA" },
  { mmsi: "216000007", name: "LIBERTY TRADER", baseLat: 33.50, baseLng: 28.00, speed: 13.5, course: 250, vesselType: "cargo", flag: "LR", destination: "GIOIA TAURO" },
  { mmsi: "216000008", name: "ISTANBUL FERRY", baseLat: 40.70, baseLng: 29.00, speed: 9.0, course: 180, vesselType: "passenger", flag: "TR", destination: "BANDIRMA" },
  // -- Malacca Strait --
  { mmsi: "217000001", name: "VLCC PIONEER", baseLat: 2.50, baseLng: 102.50, speed: 10.5, course: 310, vesselType: "tanker", flag: "SG", destination: "SINGAPORE" },
  { mmsi: "217000002", name: "OCEAN VOYAGER", baseLat: 3.00, baseLng: 101.50, speed: 14.2, course: 130, vesselType: "cargo", flag: "HK", destination: "PORT KLANG" },
  { mmsi: "217000003", name: "STRAIT RUNNER", baseLat: 1.50, baseLng: 103.80, speed: 11.0, course: 280, vesselType: "cargo", flag: "ID", destination: "JAKARTA" },
];

// Fixed epoch: vessels start moving from this point in time
const EPOCH = new Date("2026-01-01T00:00:00Z").getTime();

// Seeded pseudo-random for deterministic per-vessel variation
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function generateVessels(): VesselState[] {
  const now = Date.now();
  const elapsedHours = (now - EPOCH) / 3_600_000;

  return SEED_VESSELS.map((sv, i) => {
    // Patrol radius scales with speed: military vessels patrol wider areas
    const isMil = isMilitaryFlag(sv.flag);
    const patrolRadius = isMil ? 1.2 : sv.speed > 12 ? 0.6 : 0.35;

    // Each vessel gets unique oscillation frequencies so they don't move in sync
    const f1 = 0.008 + i * 0.0013;
    const f2 = 0.005 + i * 0.0009;
    const f3 = 0.003 + i * 0.0007;

    // Combine multiple sine waves for non-repeating patrol patterns
    const latOffset =
      patrolRadius * 0.6 * Math.sin(elapsedHours * f1 + i * 1.7) +
      patrolRadius * 0.3 * Math.sin(elapsedHours * f2 + i * 3.1) +
      patrolRadius * 0.1 * Math.cos(elapsedHours * f3 + i * 0.9);
    const lngOffset =
      patrolRadius * 0.6 * Math.cos(elapsedHours * f1 + i * 2.3) +
      patrolRadius * 0.3 * Math.cos(elapsedHours * f2 + i * 0.7) +
      patrolRadius * 0.1 * Math.sin(elapsedHours * f3 + i * 4.1);

    // Course derived from actual direction of movement (derivative of position)
    const dLatDt =
      patrolRadius * 0.6 * f1 * Math.cos(elapsedHours * f1 + i * 1.7) +
      patrolRadius * 0.3 * f2 * Math.cos(elapsedHours * f2 + i * 3.1);
    const dLngDt =
      -patrolRadius * 0.6 * f1 * Math.sin(elapsedHours * f1 + i * 2.3) +
      -patrolRadius * 0.3 * f2 * Math.sin(elapsedHours * f2 + i * 0.7);
    const derivedCourse =
      (Math.atan2(dLngDt, dLatDt) * 180) / Math.PI;

    // Speed varies gently (never below 40% of base)
    const speedFactor = 0.6 + 0.4 * Math.sin(elapsedHours * 0.01 + i * 2);
    const effectiveSpeed = sv.speed * speedFactor;

    // Small deterministic jitter that changes each minute
    const minuteBucket = Math.floor(now / 60_000);
    const jitterLat = (seededRandom(minuteBucket * 100 + i) - 0.5) * 0.003;
    const jitterLng = (seededRandom(minuteBucket * 100 + i + 50) - 0.5) * 0.003;

    return {
      mmsi: sv.mmsi,
      name: sv.name,
      lat: sv.baseLat + latOffset + jitterLat,
      lng: sv.baseLng + lngOffset + jitterLng,
      speed: Math.round(effectiveSpeed * 10) / 10,
      course: Math.round(((derivedCourse % 360) + 360) % 360),
      heading: Math.round(((derivedCourse % 360) + 360) % 360),
      vesselType: isMil ? "military" : sv.vesselType,
      flag: sv.flag,
      destination: sv.destination,
      lastUpdate: now,
    };
  });
}

/** Search vessels by MMSI or name substring (case-insensitive) */
export function findVessels(query: string): VesselState[] {
  const vessels = generateVessels();
  const q = query.toUpperCase().trim();
  return vessels.filter((v) => v.mmsi === q || v.name.toUpperCase().includes(q));
}

/** Get vessels by MMSI list */
export function getVesselsByMmsi(mmsiList: string[]): VesselState[] {
  const vessels = generateVessels();
  const set = new Set(mmsiList);
  return vessels.filter((v) => set.has(v.mmsi));
}
