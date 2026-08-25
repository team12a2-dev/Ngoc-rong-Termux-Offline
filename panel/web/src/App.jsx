import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getToken } from './api';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import DashboardPage from './pages/DashboardPage';
import PlayersPage from './pages/PlayersPage';
import PlayerDbPage from './pages/PlayerDbPage';
import AccountsPage from './pages/AccountsPage';
import ServerControlPage from './pages/ServerControlPage';
import BossPage from './pages/BossPage';
import BossManagementPage from './pages/BossManagementPage';
import EventsPage from './pages/EventsPage';
import GodSpinPage from './pages/GodSpinPage';

import GiftcodesPage from './pages/GiftcodesPage';
import ItemsPage from './pages/ItemsPage';

import ShopsPage from './pages/ShopsPage';
import ClansPage from './pages/ClansPage';
import RankingsPage from './pages/RankingsPage';
import EconomyPage from './pages/EconomyPage';
import RechargePromotionsPage from './pages/RechargePromotionsPage';

import ConfigPage from './pages/ConfigPage';
import LogsPage from './pages/LogsPage';
import PluginsPage from './pages/PluginsPage';
import ServersPage from './pages/ServersPage';
import AlertsPage from './pages/AlertsPage';
import BackupsPage from './pages/BackupsPage';
import RuntimePage from './pages/RuntimePage';
import DropConfigPage from './pages/DropConfigPage';
import UsableItemsPage from './pages/UsableItemsPage';

import Layout from './components/Layout';

function PrivateRoute({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="players" element={<PlayersPage />} />
          <Route path="players-db" element={<PlayerDbPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="server" element={<ServerControlPage />} />
                    <Route path="boss" element={<BossPage />} />
          <Route path="boss-management" element={<BossManagementPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="god-spin" element={<GodSpinPage />} />

          <Route path="giftcodes" element={<GiftcodesPage />} />
          <Route path="items" element={<ItemsPage />} />

          <Route path="shops" element={<ShopsPage />} />
          <Route path="clans" element={<ClansPage />} />
          <Route path="rankings" element={<RankingsPage />} />
                    <Route path="economy" element={<EconomyPage />} />
          <Route path="recharge-promotions" element={<RechargePromotionsPage />} />

          <Route path="config" element={<ConfigPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="plugins" element={<PluginsPage />} />
          <Route path="servers-mgmt" element={<ServersPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="backups" element={<BackupsPage />} />
          <Route path="runtime" element={<RuntimePage />} />
          <Route path="drop-config" element={<DropConfigPage />} />
          <Route path="usable-items" element={<UsableItemsPage />} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}
