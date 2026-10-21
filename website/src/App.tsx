import { StoreProvider } from "@/state";
import { Aging } from "./components/Aging";
import { Alarm } from "./components/Alarm";
import { Conclusion } from "./components/Conclusion";
import { Correlation } from "./components/Correlation";
import { Dock } from "./components/Dock";
import { Errors } from "./components/Errors";
import { Hero } from "./components/Hero";
import { Lives } from "./components/Lives";
import { Models } from "./components/Models";
import { SensorMap } from "./components/SensorMap";
import { SideNav } from "./components/SideNav";
import { Simulator } from "./components/Simulator";
import { TestGrid } from "./components/TestGrid";
import { Wear } from "./components/Wear";
import { Weights } from "./components/Weights";

export default function App() {
  return (
    <StoreProvider>
      <SideNav />
      <main className="mx-auto w-full max-w-[880px] px-4 pb-48 sm:px-8">
        <Hero />
        <SensorMap />
        <Lives />
        <Wear />
        <Correlation />
        <Models />
        <Weights />
        <Alarm />
        <TestGrid />
        <Errors />
        <Aging />
        <Simulator />
        <Conclusion />
      </main>
      <Dock />
    </StoreProvider>
  );
}
