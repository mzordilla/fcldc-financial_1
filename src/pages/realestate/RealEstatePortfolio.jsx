import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Building2, MapPinned, Users, ClipboardList, ShoppingCart, PieChart, CalendarClock, HandCoins, CreditCard, UserRoundCog } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CondoUnits from "./CondoUnits";
import Tenants from "./Tenants";
import Listings from "./Listings";
import PortfolioReports from "./PortfolioReports";
import LeaseCollectionTracker from "../../components/realestate/LeaseCollectionTracker";
import ClientPaymentTracker from "../../components/realestate/ClientPaymentTracker";
import RealEstateClients from "../../components/realestate/RealEstateClients";
import LeaseBillingCycles from "@/components/realestate/LeaseBillingCycles";
import BuildingMap from "@/components/realestate/BuildingMap";

export default function RealEstatePortfolio() {
  const navigate = useNavigate();

  return (
    <div className="w-full p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Real Estate Portfolio</h1>
        <p className="text-muted-foreground mt-1">Manage condo units, tenants, listings, and reports</p>
      </div>
      <Tabs defaultValue="units" className="w-full">
        <div className="mb-5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <TabsList className="grid h-[90px] min-w-[900px] grid-cols-10 gap-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-0 dark:border-slate-700 dark:bg-slate-950">
            <TabsTrigger value="units" className="group h-full flex-col gap-1.5 rounded-none border-r border-slate-200 px-2 text-xs font-medium leading-tight text-teal-700 shadow-none data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md dark:border-slate-700 dark:text-teal-400 dark:data-[state=active]:bg-slate-800">
              <Building2 className="h-6 w-6 text-slate-800 group-data-[state=active]:text-white dark:text-slate-200" />
              <span>Condo<br />Units</span>
            </TabsTrigger>
            <TabsTrigger value="building-map" className="group h-full flex-col gap-1.5 rounded-none border-r border-slate-200 px-2 text-xs font-medium leading-tight text-teal-700 shadow-none data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md dark:border-slate-700 dark:text-teal-400 dark:data-[state=active]:bg-slate-800">
              <MapPinned className="h-6 w-6 text-slate-800 group-data-[state=active]:text-white dark:text-slate-200" />
              <span>Building<br />Map</span>
            </TabsTrigger>
            <TabsTrigger value="tenants" className="group h-full flex-col gap-1.5 rounded-none border-r border-slate-200 px-2 text-xs font-medium leading-tight text-teal-700 shadow-none data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md dark:border-slate-700 dark:text-teal-400 dark:data-[state=active]:bg-slate-800">
              <Users className="h-6 w-6 text-slate-800 group-data-[state=active]:text-white dark:text-slate-200" />
              <span>Tenants</span>
            </TabsTrigger>
            <TabsTrigger value="listings" className="group h-full flex-col gap-1.5 rounded-none border-r border-slate-200 px-2 text-xs font-medium leading-tight text-teal-700 shadow-none data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md dark:border-slate-700 dark:text-teal-400 dark:data-[state=active]:bg-slate-800">
              <ClipboardList className="h-6 w-6 text-slate-800 group-data-[state=active]:text-white dark:text-slate-200" />
              <span>Listings</span>
            </TabsTrigger>
            <TabsTrigger value="condo-sales" onClick={() => navigate("/re/condo-sales")} className="group h-full flex-col gap-1.5 rounded-none border-r border-slate-200 px-2 text-xs font-medium leading-tight text-teal-700 shadow-none data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md dark:border-slate-700 dark:text-teal-400 dark:data-[state=active]:bg-slate-800">
              <ShoppingCart className="h-6 w-6 text-slate-800 group-data-[state=active]:text-white dark:text-slate-200" />
              <span>Condo<br />Sales</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="group h-full flex-col gap-1.5 rounded-none border-r border-slate-200 px-2 text-xs font-medium leading-tight text-teal-700 shadow-none data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md dark:border-slate-700 dark:text-teal-400 dark:data-[state=active]:bg-slate-800">
              <PieChart className="h-6 w-6 text-slate-800 group-data-[state=active]:text-white dark:text-slate-200" />
              <span>Portfolio<br />Reports</span>
            </TabsTrigger>
            <TabsTrigger value="lease-billing" className="group h-full flex-col gap-1.5 rounded-none border-r border-slate-200 px-2 text-xs font-medium leading-tight text-teal-700 shadow-none data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md dark:border-slate-700 dark:text-teal-400 dark:data-[state=active]:bg-slate-800">
              <CalendarClock className="h-6 w-6 text-slate-800 group-data-[state=active]:text-white dark:text-slate-200" />
              <span>Lease Billing<br />Cycles</span>
            </TabsTrigger>
            <TabsTrigger value="lease-collections" className="group h-full flex-col gap-1.5 rounded-none border-r border-slate-200 px-2 text-xs font-medium leading-tight text-teal-700 shadow-none data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md dark:border-slate-700 dark:text-teal-400 dark:data-[state=active]:bg-slate-800">
              <HandCoins className="h-6 w-6 text-slate-800 group-data-[state=active]:text-white dark:text-slate-200" />
              <span>Lease<br />Collections</span>
            </TabsTrigger>
            <TabsTrigger value="client-payments" className="group h-full flex-col gap-1.5 rounded-none border-r border-slate-200 px-2 text-xs font-medium leading-tight text-teal-700 shadow-none data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md dark:border-slate-700 dark:text-teal-400 dark:data-[state=active]:bg-slate-800">
              <CreditCard className="h-6 w-6 text-slate-800 group-data-[state=active]:text-white dark:text-slate-200" />
              <span>Client<br />Payments</span>
            </TabsTrigger>
            <TabsTrigger value="re-clients" className="group h-full flex-col gap-1.5 rounded-none px-2 text-xs font-medium leading-tight text-teal-700 shadow-none data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-md dark:text-teal-400 dark:data-[state=active]:bg-slate-800">
              <UserRoundCog className="h-6 w-6 text-slate-800 group-data-[state=active]:text-white dark:text-slate-200" />
              <span>RE Clients</span>
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="units">
          <CondoUnits embedded />
        </TabsContent>
        <TabsContent value="building-map">
          <BuildingMap />
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