import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { AccessibilityProvider } from "./contexts/AccessibilityContext";
import { AccessibilityToolbar } from "./components/AccessibilityToolbar";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import StudentQuiz from "./pages/StudentQuiz";
import TeacherPage from "./pages/TeacherPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/docente" component={TeacherPage} />
      <Route path="/quiz" component={StudentQuiz} />
      <Route path="/quiz/:code" component={StudentQuiz} />
      <Route component={Home} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AccessibilityProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <AccessibilityToolbar />
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  );
}

export default App;
