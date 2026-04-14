import { EmployeeStatus } from "../../../../types";

export const getStatusColor = (status: EmployeeStatus | string): string => {
  switch (status) {
    case EmployeeStatus.ACTIVE:
      return "text-emerald-500 bg-emerald-500/10";
    case EmployeeStatus.ON_LEAVE:
      return "text-orange-500 bg-orange-500/10";
    case EmployeeStatus.SUSPENDED:
      return "text-red-500 bg-red-500/10";
    case EmployeeStatus.TERMINATED:
      return "text-slate-500 bg-slate-500/10";
    default:
      return "text-slate-400 bg-slate-400/10";
  }
};

export const getStatusLabel = (status: EmployeeStatus | string): string => {
  switch (status) {
    case EmployeeStatus.ACTIVE:
      return "نشط";
    case EmployeeStatus.ON_LEAVE:
      return "في إجازة";
    case EmployeeStatus.SUSPENDED:
      return "موقوف";
    case EmployeeStatus.TERMINATED:
      return "مفصول";
    case EmployeeStatus.RESIGNED:
      return "مستقيل";
    default:
      return status as string;
  }
};
