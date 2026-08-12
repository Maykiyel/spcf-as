import type { FeeCatalogItem } from "../types";

// TODO(transactions-api): temporary stand-in for a real `getServices` call.
// Delete this file once the Fee Catalog panel is wired to the backend —
// see the TODO on `FeeCatalogItem` in `../types`.
export const MOCK_FEE_CATALOG: FeeCatalogItem[] = [
  {
    id: 1,
    name: "Graduation Fee - SHS",
    description: "Senior high school graduation fee.",
    price: 1500,
    itemCode: "GRAD",
  },
  {
    id: 2,
    name: "Graduation Fee - College",
    description: "College graduation fee.",
    price: 1800,
    itemCode: "GRAD",
  },
  {
    id: 3,
    name: "TOIEC Exam Fee",
    description: "Test of International English Communication.",
    price: 450,
    itemCode: "TOIEC",
  },
  {
    id: 4,
    name: "TOIEC Retake Fee",
    description: "Retake fee for the TOIEC exam.",
    price: 250,
    itemCode: "TOIEC",
  },
  {
    id: 5,
    name: "Alumni Association Fee",
    description: "Annual alumni association membership.",
    price: 300,
    itemCode: "ALUMNI",
  },
  {
    id: 6,
    name: "Alumni ID Replacement",
    description: "Replacement fee for a lost alumni ID.",
    price: 150,
    itemCode: "ALUMNI",
  },
  {
    id: 7,
    name: "Moving Up Fee - Grade 6",
    description: "Elementary moving-up ceremony fee.",
    price: 850,
    itemCode: "MOVING UP",
  },
  {
    id: 8,
    name: "Moving Up Fee - Grade 10",
    description: "Junior high moving-up ceremony fee.",
    price: 950,
    itemCode: "MOVING UP",
  },
  {
    id: 9,
    name: "Parking Sticker",
    description: "Annual campus parking sticker.",
    price: 200,
    itemCode: "PARKING",
  },
  {
    id: 10,
    name: "Parking Sticker Replacement",
    description: "Replacement for a lost parking sticker.",
    price: 100,
    itemCode: "PARKING",
  },
  {
    id: 11,
    name: "Swimming Class Fee",
    description: "PE swimming class fee, per term.",
    price: 1200,
    itemCode: "SWIMMING",
  },
  {
    id: 12,
    name: "Swimming Pool Day Pass",
    description: "Single-day access to the campus pool.",
    price: 120,
    itemCode: "SWIMMING",
  },
];
