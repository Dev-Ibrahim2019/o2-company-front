import { DomainTable, SectionFrame, text, unwrapRows, useCrmSection } from "./shared";

// "العنوان" used to read a column named `address`, which customer_addresses
// does not have — the real address is split across `street`/`building_no`
// (confirmed against CrmController::addresses(), which returns the row as-is;
// see the field-inventory audit). Combined here into one readable string
// instead of one dead column plus city/area repeating what already has
// their own columns to the right.
function streetLine(r: Record<string, unknown>): string {
  const street = r.street ? String(r.street) : null;
  const building = r.building_no ? `مبنى ${r.building_no}` : null;
  const parts = [street, building].filter(Boolean);
  return parts.length ? parts.join("، ") : "—";
}

export default function AddressesTab(){const state=useCrmSection("addresses");return <SectionFrame state={state}>{d=><DomainTable empty="لا توجد عناوين محفوظة" rows={unwrapRows(d,["addresses"])} columns={[{key:"label",label:"نوع العنوان",render:(v,r)=>text(v??r.type)},{key:"street",label:"العنوان",render:(_v,r)=>streetLine(r)},{key:"city",label:"المدينة"},{key:"area",label:"المنطقة"},{key:"is_default",label:"الافتراضي",render:v=>v?"نعم":"لا"}]}/>}</SectionFrame>}
