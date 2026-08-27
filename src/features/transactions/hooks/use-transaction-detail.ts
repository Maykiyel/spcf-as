import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { getTransaction } from "../api/get-transaction";

// Shared by ViewTransactionPage and the Print page — both need the exact
// same fetch-fresh-always behavior and the exact same 403 classification
export function useTransactionDetail(controlId: number) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["transactions", controlId],
    queryFn: () => getTransaction(controlId),
  });

  const isForbidden =
    isError && error instanceof AxiosError && error.response?.status === 403;

  return {
    transaction: data,
    isLoading,
    isError,
    isForbidden,
  };
}
