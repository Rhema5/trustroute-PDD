/**
 * Hub Routing Utility & Regional Boundary Scoping Engine
 * Defines 20 km regional hub coverage zones, geographic center coordinates,
 * micro-location databases, and distance boundary validators.
 */

export type HubRegion = "Avadi" | "Poonamallee" | "Koyambedu" | "Vellore" | "Default";

export interface EnterpriseHubConfig {
  name: string;
  email: string;
  region: HubRegion;
  description: string;
  centerCoords: { lat: number; lng: number };
  keywords: string[];
  subAreas: { name: string; address: string; lat: number; lng: number }[];
}

export const REGIONAL_HUBS: Record<HubRegion, EnterpriseHubConfig> = {
  Avadi: {
    name: "Avadi Regional Hub",
    email: "enterprise_avadi@trustroute.com",
    region: "Avadi",
    description: "Serves Avadi, Pattabiram, Ambattur, Govarthanagiri, Sekkadu, Kamaraj Nagar, VGV Nagar, and West Chennai zones (20 km radius).",
    centerCoords: { lat: 13.1147, lng: 80.1098 },
    keywords: ["avadi", "ambattur", "pattabiram", "mitanamallee", "thirumullaivoyal", "hvf", "iaf", "govarthanagiri", "govardhanagiri", "sekkadu", "paruthipattu", "kamaraj nagar", "vgv nagar", "ayapakkam"],
    subAreas: [
      { name: "Avadi Railway Station Road", address: "Avadi Railway Station Road, Avadi, Chennai - 600054", lat: 13.1147, lng: 80.1098 },
      { name: "VGV Nagar (V.G.V. Nagar)", address: "VGV Nagar, Avadi, Chennai - 600071", lat: 13.1115, lng: 80.0880 },
      { name: "Kamaraj Nagar 1st to 10th Street", address: "Kamaraj Nagar, Avadi, Chennai - 600071", lat: 13.1154, lng: 80.0954 },
      { name: "Govarthanagiri (Govardhanagiri Main Road)", address: "Govarthanagiri Main Road, Avadi, Chennai - 600071", lat: 13.1098, lng: 80.0895 },
      { name: "Sekkadu Main Road & Sekkadu Village", address: "Sekkadu Main Road, Avadi, Chennai - 600071", lat: 13.1165, lng: 80.0821 },
      { name: "Gandhi Nagar Main Street", address: "Gandhi Nagar, Avadi, Chennai - 600054", lat: 13.1112, lng: 80.1023 },
      { name: "Vivekananda Nagar", address: "Vivekananda Nagar, Avadi, Chennai - 600054", lat: 13.1175, lng: 80.1012 },
      { name: "N.M. Nagar (NM Nagar)", address: "NM Nagar, Avadi, Chennai - 600054", lat: 13.1210, lng: 80.1065 },
      { name: "Sriram Nagar", address: "Sriram Nagar, Pattabiram, Chennai - 600072", lat: 13.1265, lng: 80.0689 },
      { name: "Ganesh Nagar", address: "Ganesh Nagar, Avadi, Chennai - 600071", lat: 13.1085, lng: 80.0921 },
      { name: "Balaji Nagar", address: "Balaji Nagar, Avadi, Chennai - 600071", lat: 13.1072, lng: 80.0945 },
      { name: "Vasantham Nagar", address: "Vasantham Nagar, Avadi, Chennai - 600071", lat: 13.1130, lng: 80.0865 },
      { name: "Poompozhil Nagar", address: "Poompozhil Nagar, Avadi, Chennai - 600062", lat: 13.1280, lng: 80.1210 },
      { name: "Mullai Nagar", address: "Mullai Nagar, Thirumullaivoyal, Chennai - 600062", lat: 13.1270, lng: 80.1310 },
      { name: "Cauvery Nagar", address: "Cauvery Nagar, Avadi, Chennai - 600071", lat: 13.1060, lng: 80.0910 },
      { name: "Anna Nagar Avadi", address: "Anna Nagar, Avadi, Chennai - 600054", lat: 13.1205, lng: 80.1089 },
      { name: "Pattabiram Bus Stand & Junction", address: "Pattabiram Main Road, Pattabiram, Chennai - 600072", lat: 13.1245, lng: 80.0632 },
      { name: "Paruthipattu Lake & Colony", address: "Paruthipattu Main Road, Avadi, Chennai - 600071", lat: 13.1050, lng: 80.0980 },
      { name: "J.B. Nagar (JB Nagar)", address: "JB Nagar Main Road, Avadi, Chennai - 600054", lat: 13.1180, lng: 80.1120 },
      { name: "Nehru Nagar Avadi", address: "Nehru Nagar, Avadi, Chennai - 600054", lat: 13.1198, lng: 80.1045 },
      { name: "Mitnamallee & IAF Camp Station", address: "IAF Station Main Gate, Mitnamallee, Avadi, Chennai - 600055", lat: 13.1420, lng: 80.0950 },
      { name: "HVF Estate & Ordnance Factory", address: "Heavy Vehicles Factory Road, HVF Estate, Avadi, Chennai - 600054", lat: 13.1298, lng: 80.1154 },
      { name: "Thirumullaivoyal MTH Road", address: "MTH Road, Thirumullaivoyal, Chennai - 600062", lat: 13.1256, lng: 80.1345 },
      { name: "Ayapakkam TNHB Phase 1 & 2", address: "Ayapakkam Main Road, TNHB Colony, Chennai - 600077", lat: 13.0980, lng: 80.1420 },
      { name: "Ambattur OT Bus Depot", address: "Ambattur OT Bus Stand, MTH Road, Chennai - 600053", lat: 13.1189, lng: 80.1542 },
      { name: "Ambattur Industrial Estate 3rd Main Road", address: "Industrial Estate 3rd Main Road, Ambattur, Chennai - 600058", lat: 13.0954, lng: 80.1623 },
      { name: "Thiruverkadu Temple Sannathi Street", address: "Sannathi Street, Thiruverkadu, Chennai - 600077", lat: 13.0721, lng: 80.1245 },
      { name: "Sundara Cholapuram Main Road", address: "Sundara Cholapuram, Avadi, Chennai - 600077", lat: 13.0920, lng: 80.1080 },
      { name: "Thandurai Village", address: "Thandurai Main Road, Pattabiram, Chennai - 600072", lat: 13.1310, lng: 80.0540 },
      { name: "Kovilpadagai Village & Lake Zone", address: "Kovilpadagai Main Road, Avadi, Chennai - 600062", lat: 13.1390, lng: 80.1180 },
      { name: "Muthapudupet Air Force Base Area", address: "Muthapudupet Main Road, Avadi, Chennai - 600055", lat: 13.1480, lng: 80.1020 },
      { name: "Pakkam & Vellanur Village", address: "Pakkam Main Road, Avadi Outer, Chennai - 602024", lat: 13.1620, lng: 80.0890 },
      { name: "Nemilichery Railway Station & High Road", address: "Nemilichery High Road, Thiruninravur, Chennai - 602024", lat: 13.1210, lng: 80.0380 },
      { name: "Thiruninravur CTH Road & Bus Terminus", address: "CTH Road, Thiruninravur, Chennai - 602024", lat: 13.1180, lng: 80.0240 },
      { name: "Perumalpattu Village Zone", address: "Perumalpattu Main Road, Thiruninravur Outer, Chennai - 602024", lat: 13.1020, lng: 79.9980 },
      { name: "Bhakthavatsalam Nagar", address: "Bhakthavatsalam Nagar, Avadi, Chennai - 600054", lat: 13.1160, lng: 80.1090 },
      { name: "O.C.F. Estate (Ordnance Clothing Factory)", address: "OCF Factory Road, Avadi, Chennai - 600054", lat: 13.1240, lng: 80.1110 },
      { name: "C.V.R.D.E. Campus & EFA", address: "CVRDE Main Road, Avadi, Chennai - 600054", lat: 13.1280, lng: 80.1050 },
      { name: "Manikandapuram", address: "Manikandapuram, Thirumullaivoyal, Chennai - 600062", lat: 13.1310, lng: 80.1290 },
      { name: "Varadarajapuram Ambattur", address: "Varadarajapuram Main Road, Ambattur, Chennai - 600053", lat: 13.1120, lng: 80.1480 },
      { name: "Veeraraghavapuram", address: "Veeraraghavapuram Road, Thiruverkadu, Chennai - 600077", lat: 13.0820, lng: 80.1190 },
      { name: "Koladi Road & Cooum Bank Area", address: "Koladi Road, Thiruverkadu, Chennai - 600077", lat: 13.0760, lng: 80.1140 },
    ],
  },
  Poonamallee: {
    name: "Poonamallee Regional Hub",
    email: "enterprise_poonamallee@trustroute.com",
    region: "Poonamallee",
    description: "Serves Poonamallee, Saveetha, Porur, Kumananchavadi, Mangadu, Thirumazhisai, Irungattukottai (20 km radius).",
    centerCoords: { lat: 13.0498, lng: 80.0934 },
    keywords: ["poonamallee", "ponnamalle", "saveetha", "porur", "kumananchavadi", "nazarathpet", "thandalam", "mangadu", "senneerkuppam", "kattupakkam", "thirumazhisai", "kundrathur"],
    subAreas: [
      { name: "Poonamallee Bus Terminus & Trunk Road", address: "Trunk Road, Poonamallee, Chennai - 600056", lat: 13.0498, lng: 80.0934 },
      { name: "Saveetha Medical College & Campus", address: "Saveetha Nagar, Thandalam, Chennai - 602105", lat: 13.0298, lng: 79.9721 },
      { name: "Kumananchavadi Junction & Signal", address: "Poonamallee High Road, Kumananchavadi, Chennai - 600056", lat: 13.0465, lng: 80.1123 },
      { name: "Porur Roundtana & DLF IT Park", address: "Mount-Poonamallee Road, Porur, Chennai - 600116", lat: 13.0382, lng: 80.1564 },
      { name: "Nazarathpet Police Station Junction", address: "Bangalore National Highway, Nazarathpet, Chennai - 600123", lat: 13.0421, lng: 80.0654 },
      { name: "Mangadu Amman Temple Zone", address: "Mangadu Main Road, Mangadu, Chennai - 600122", lat: 13.0350, lng: 80.1180 },
      { name: "Senneerkuppam Bypass Junction", address: "Senneerkuppam Main Road, Poonamallee, Chennai - 600056", lat: 13.0560, lng: 80.0840 },
      { name: "Kattupakkam Signal", address: "Mount-Poonamallee Road, Kattupakkam, Chennai - 600056", lat: 13.0410, lng: 80.1290 },
      { name: "Karayanchavadi Bus Stop", address: "Poonamallee High Road, Karayanchavadi, Chennai - 600056", lat: 13.0475, lng: 80.1040 },
      { name: "Chembarambakkam Water Works & Dam", address: "Chembarambakkam Lake Road, Chennai - 600124", lat: 13.0154, lng: 80.0234 },
      { name: "Iyyappanthangal Bus Depot & Oil Mill", address: "Iyyappanthangal Main Road, Chennai - 600056", lat: 13.0389, lng: 80.1345 },
      { name: "Thirumazhisai Satellite Town & Bus Stop", address: "CTH Road, Thirumazhisai, Chennai - 600124", lat: 13.0580, lng: 80.0210 },
      { name: "Irungattukottai SIPCOT Industrial Zone", address: "SIPCOT Industrial Park, Irungattukottai, Chennai - 602117", lat: 12.9850, lng: 79.9540 },
      { name: "Sriperumbudur Highway Tollgate Zone", address: "Bangalore Highway, Sriperumbudur, Chennai - 602105", lat: 12.9690, lng: 79.9410 },
      { name: "Parivakkam Village & Bypass", address: "Parivakkam Main Road, Poonamallee, Chennai - 600056", lat: 13.0640, lng: 80.0710 },
      { name: "Kundrathur Murugan Temple Zone", address: "Kundrathur Main Road, Kundrathur, Chennai - 600069", lat: 12.9980, lng: 80.0960 },
      { name: "Kovur & Gerugambakkam Signal", address: "Kovur Main Road, Chennai - 600128", lat: 13.0120, lng: 80.1240 },
      { name: "Malayambakkam Village", address: "Malayambakkam Main Road, Poonamallee, Chennai - 600056", lat: 13.0320, lng: 80.0480 },
    ],
  },
  Koyambedu: {
    name: "Koyambedu Regional Hub",
    email: "enterprise_koyambedu@trustroute.com",
    region: "Koyambedu",
    description: "Serves Koyambedu Wholesale Market, CMBT, Vadapalani, Anna Nagar, Choolaimedu, T. Nagar, Ashok Nagar (20 km radius).",
    centerCoords: { lat: 13.0694, lng: 80.1948 },
    keywords: ["koyambedu", "cmbt", "vadapalani", "anna nagar", "arumbakkam", "mmda", "choolaimedu", "aminjikarai", "tnagar", "ashok nagar"],
    subAreas: [
      { name: "Koyambedu Wholesale Vegetable & Flower Market", address: "Market Road, Koyambedu, Chennai - 600107", lat: 13.0694, lng: 80.1948 },
      { name: "CMBT Bus Terminus & MTC Depot", address: "Inner Ring Road, Koyambedu, Chennai - 600107", lat: 13.0678, lng: 80.1989 },
      { name: "Vadapalani Murugan Temple & Forum Mall", address: "100 Feet Road, Vadapalani, Chennai - 600026", lat: 13.0504, lng: 80.2121 },
      { name: "Anna Nagar Tower Park & 2nd Avenue", address: "3rd Avenue, Anna Nagar, Chennai - 600040", lat: 13.0850, lng: 80.2101 },
      { name: "Arumbakkam Metro Station & PH Road", address: "PH Road, Arumbakkam, Chennai - 600106", lat: 13.0745, lng: 80.2056 },
      { name: "MMDA Colony Block A to G", address: "MMDA Colony, Arumbakkam, Chennai - 600106", lat: 13.0654, lng: 80.2154 },
      { name: "Choolaimedu High Road & Nelson Manickam Road", address: "Choolaimedu High Road, Choolaimedu, Chennai - 600094", lat: 13.0610, lng: 80.2240 },
      { name: "Aminjikarai Tollgate Bus Stop", address: "Poonamallee High Road, Aminjikarai, Chennai - 600029", lat: 13.0730, lng: 80.2190 },
      { name: "Shenoy Nagar Metro & Park", address: "East Club Road, Shenoy Nagar, Chennai - 600030", lat: 13.0790, lng: 80.2260 },
      { name: "Thirumangalam Metro & Junction", address: "100 Feet Road, Thirumangalam, Anna Nagar, Chennai - 600040", lat: 13.0890, lng: 80.1980 },
      { name: "Kilpauk Medical College & Hospital", address: "PH Road, Kilpauk, Chennai - 600010", lat: 13.0780, lng: 80.2410 },
      { name: "Egmore Railway Station & Chetpet", address: "Gandhi Irwin Road, Egmore, Chennai - 600008", lat: 13.0785, lng: 80.2610 },
      { name: "T. Nagar Ranganathan Street & Panagal Park", address: "Usman Road, T. Nagar, Chennai - 600017", lat: 13.0410, lng: 80.2330 },
      { name: "Ashok Nagar Pillar & 100 Feet Road", address: "1st Avenue, Ashok Nagar, Chennai - 600083", lat: 13.0360, lng: 80.2110 },
      { name: "K.K. Nagar Bus Depot & Double Tank", address: "Munusamy Salai, KK Nagar, Chennai - 600078", lat: 13.0390, lng: 80.1980 },
      { name: "Virugambakkam Market & Arcot Road", address: "Arcot Road, Virugambakkam, Chennai - 600092", lat: 13.0510, lng: 80.1920 },
      { name: "Saligramam Film City & Bus Stop", address: "Saligramam, Chennai - 600093", lat: 13.0560, lng: 80.1990 },
    ],
  },
  Vellore: {
    name: "Vellore Regional Hub",
    email: "enterprise_vellore@trustroute.com",
    region: "Vellore",
    description: "Serves Vellore City, Katpadi Junction, VIT Campus, CMC, Sathuvachari, Gandhinagar, Ranipet (20 km radius).",
    centerCoords: { lat: 12.9165, lng: 79.1325 },
    keywords: ["vellore", "katpadi", "vit", "ranipet", "sathuvachari", "cmc", "gandhinagar", "thorapadi", "melvisharam", "walajah"],
    subAreas: [
      { name: "Katpadi Junction Railway Station", address: "Katpadi Railway Station Road, Katpadi, Vellore - 632007", lat: 12.9712, lng: 79.1378 },
      { name: "VIT University Main Campus & Tech Tower", address: "VIT Main Road, Katpadi, Vellore - 632014", lat: 12.9692, lng: 79.1559 },
      { name: "Sathuvachari Phase 1, 2 & 3 TNHB", address: "Phase 1, Sathuvachari, Vellore - 632009", lat: 12.9345, lng: 79.1623 },
      { name: "CMC Hospital Main Gate & Scudder Road", address: "IDA Scudder Road, Vellore - 632004", lat: 12.9254, lng: 79.1345 },
      { name: "Green Circle & Old Bus Stand", address: "Bangalore Road, Green Circle, Vellore - 632004", lat: 12.9389, lng: 79.1367 },
      { name: "Gandhinagar Katpadi 1st East Main Road", address: "Gandhinagar, Katpadi, Vellore - 632006", lat: 12.9620, lng: 79.1430 },
      { name: "Bagayam & CMC Rehab Centre", address: "Bagayam Main Road, Vellore - 632002", lat: 12.8940, lng: 79.1290 },
      { name: "Thorapadi & Central Prison Zone", address: "Thorapadi Main Road, Vellore - 632002", lat: 12.9050, lng: 79.1210 },
      { name: "Fort Vellore & Jalakanteswarar Temple", address: "Fort Round Road, Vellore - 632004", lat: 12.9210, lng: 79.1320 },
      { name: "Viruthampet & Katpadi North", address: "Chittoor Road, Viruthampet, Katpadi, Vellore - 632006", lat: 12.9550, lng: 79.1350 },
      { name: "Ranipet SIPCOT Industrial Town", address: "Ranipet SIPCOT, Ranipet, Vellore District - 632403", lat: 12.9280, lng: 79.3320 },
      { name: "Melvisharam Highway Corridor", address: "Chennai-Bangalore Highway, Melvisharam - 632509", lat: 12.9340, lng: 79.2410 },
      { name: "Otteri Lake & Park Area", address: "Bagayam Road, Otteri, Vellore - 632002", lat: 12.8990, lng: 79.1380 },
      { name: "Walajah Road Railway Junction", address: "Walajah Road, Vellore District - 632513", lat: 12.9890, lng: 79.3780 },
    ],
  },
  Default: {
    name: "Default General Hub",
    email: "enterprise@gmail.com",
    region: "Default",
    description: "Fallback general hub for all other regions outside the primary 4 hubs.",
    centerCoords: { lat: 13.0827, lng: 80.2707 },
    keywords: [],
    subAreas: [],
  },
};

/**
 * Calculates straight-line distance in kilometers between two coordinates.
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Checks if target coordinates are within maxKm (default 20 km) of the Hub's center.
 */
export function isWithinRegionalRadius(
  hubRegion: HubRegion,
  targetLat: number,
  targetLng: number,
  maxKm: number = 20
): { valid: boolean; distanceKm: number } {
  const config = REGIONAL_HUBS[hubRegion] || REGIONAL_HUBS.Default;
  const dist = calculateDistanceKm(config.centerCoords.lat, config.centerCoords.lng, targetLat, targetLng);
  return {
    valid: dist <= maxKm,
    distanceKm: dist,
  };
}

/**
 * Parses a location string or address to detect its regional hub.
 */
export function detectHubRegion(locationStr: string): HubRegion {
  if (!locationStr) return "Avadi"; // Default region for Chennai
  const lower = locationStr.toLowerCase();

  for (const [regionKey, config] of Object.entries(REGIONAL_HUBS)) {
    if (regionKey === "Default") continue;
    for (const keyword of config.keywords) {
      if (lower.includes(keyword)) {
        return regionKey as HubRegion;
      }
    }
  }

  return "Avadi";
}

/**
 * Returns the matching Enterprise Email for a given region.
 */
export function getHubEmailForRegion(region: HubRegion): string {
  return REGIONAL_HUBS[region]?.email || REGIONAL_HUBS.Default.email;
}

/**
 * Returns list of available primary hub regions for dropdown UI selection.
 */
export const AVAILABLE_HUB_REGIONS: HubRegion[] = [
  "Avadi",
  "Poonamallee",
  "Koyambedu",
  "Vellore",
];
