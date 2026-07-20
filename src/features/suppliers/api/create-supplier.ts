import { z } from "zod";
import { apiClient } from "@/lib/axios/api-client";
import type { Supplier } from "../types";

const phRegex = /^(09\d{9}|\+639\d{9}|639\d{9})$/; // PH mobile: 09XXXXXXXXX / +639XXXXXXXXX / 639XXXXXXXXX
const internationalRegex = /^\+[1-9]\d{7,14}$/; // generic intl: + followed by 8-15 digits (E.164-ish)

export const supplierInputSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(255),
  contact_no: z
    .string()
    .min(1, "Contact number is required")
    .refine(
      (val) => {
        const stripped = val.replace(/[\s()-]/g, ""); // ignore spaces/dashes/parens for format checking
        return phRegex.test(stripped) || internationalRegex.test(stripped);
      },
      {
        message:
          "Enter a valid PH mobile number (09XXXXXXXXX) or international number (+countrycode...)",
      },
    ),
  email: z.string().email("Invalid email address").max(255),
  description: z.string().max(255).optional(),
});

export type SupplierInput = z.infer<typeof supplierInputSchema>;

type CreateSupplierData = {
  supplier: Supplier;
};

export const createSupplier = async (
  data: SupplierInput,
): Promise<Supplier> => {
  const response = await apiClient.post<CreateSupplierData, SupplierInput>(
    "/suppliers",
    data,
  );
  return response.data.supplier;
};
