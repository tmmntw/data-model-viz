import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SchemaProvider } from "@/lib/schemaContext";
import NotFound from "@/pages/not-found";
import DataModel from "@/pages/data-model";
import Upload from "@/pages/upload";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Upload} />
      <Route path="/visualize" component={DataModel} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SchemaProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </SchemaProvider>
    </QueryClientProvider>
  );
}

export default App;
