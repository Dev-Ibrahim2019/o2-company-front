import { useParams } from "react-router-dom";
import { LoyaltyPanel } from "../LoyaltyPanel";

export default function LoyaltyTab() {
  const { customerId = "" } = useParams();
  return <div className="crmx-root"><LoyaltyPanel owner="customers" ownerId={customerId} /></div>;
}
