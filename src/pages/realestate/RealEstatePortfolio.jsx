import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CondoUnits from "./CondoUnits";
import Tenants from "./Tenants";
import Listings from "./Listings";
import PortfolioReports from "./PortfolioReports";
import LeaseCollectionTracker from "../../components/realestate/LeaseCollectionTracker";
import ClientPaymentTracker from "../../components/realestate/ClientPaymentTracker";
import RealEstateClients from "../../components/realestate/RealEstateClients";
import LeaseBillingCycles from "@/components/realestate/LeaseBillingCycles";

export default function RealEstatePortfolio() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Real Estate Portfolio</h1>
        <p className="text-muted-foreground mt-1">Manage condo units, tenants, listings, and reports</p>
      </div>
      <Tabs defaultValue="units" className="w-full">
        <TabsList className="mb-4 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 p-1 rounded-xl">
          <TabsTrigger value="units" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white transition-all">
            🏢 Condo Units
          </TabsTrigger>
          <TabsTrigger value="tenants" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all">
            👥 Tenants
          </TabsTrigger>
          <TabsTrigger value="listings" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-600 data-[state=active]:text-white transition-all">
            📋 Listings
          </TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white transition-all">
            📊 Portfolio Reports
          </TabsTrigger>
          <TabsTrigger value="lease-billing" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white transition-all">
            Lease Billing Cycles
          </TabsTrigger>
          <TabsTrigger value="lease-collections" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-blue-600 data-[state=active]:text-white transition-all">
            💰 Lease Collections
          </TabsTrigger>
          <TabsTrigger value="client-payments" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-500 data-[state=active]:to-red-600 data-[state=active]:text-white transition-all">
            🧾 Client Payments
          </TabsTrigger>
          <TabsTrigger value="re-clients" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-fuchsia-600 data-[state=active]:text-white transition-all">
            👤 RE Clients
          </TabsTrigger>
        </TabsList>
        <TabsContent value="units">
          <CondoUnits embedded />
        </TabsContent>
        <TabsContent value="tenants">
          <Tenants embedded />
        </TabsContent>
        <TabsContent value="listings">
          <Listings embedded />
        </TabsContent>
        <TabsContent value="reports">
          <PortfolioReports embedded />
        </TabsContent>
        <TabsContent value="lease-billing">
          <LeaseBillingCycles />
        </TabsContent>
        <TabsContent value="lease-collections">
          <LeaseCollectionTracker />
        </TabsContent>
        <TabsContent value="client-payments">
          <ClientPaymentTracker />
        </TabsContent>
        <TabsContent value="re-clients">
          <RealEstateClients />
        </TabsContent>
      </Tabs>
    </div>
  );
}