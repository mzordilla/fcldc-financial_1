import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CondoUnits from "./CondoUnits";
import Tenants from "./Tenants";
import Listings from "./Listings";
import PortfolioReports from "./PortfolioReports";

export default function RealEstatePortfolio() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Real Estate Portfolio</h1>
        <p className="text-muted-foreground mt-1">Manage condo units, tenants, listings, and reports</p>
      </div>
      <Tabs defaultValue="units" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="units">Condo Units</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="reports">Portfolio Reports</TabsTrigger>
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
      </Tabs>
    </div>
  );
}