import './App.css'
import Reader from "./pages/Reader";
import { SettingsProvider } from "./contexts/SettingsContext";

function App() {
  return (
    <SettingsProvider>
      <div>
        <Reader />
      </div>
    </SettingsProvider>
  )
}

export default App
