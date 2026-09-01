/** SPAのルート定義（クライアントサイドルーティング）と、共通プロバイダの組み立て。 */
import type { ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.js';
import { AppDataProvider } from './context/AppDataContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { AssignmentsPage } from './pages/AssignmentsPage.js';
import { ChangeImpactsPage } from './pages/ChangeImpactsPage.js';
import { DimensionsPage } from './pages/DimensionsPage.js';
import { HomePage } from './pages/HomePage.js';
import { ModelsPage } from './pages/ModelsPage.js';
import { OrgViewPage } from './pages/OrgViewPage.js';
import { PoliciesPage } from './pages/PoliciesPage.js';
import { TaskAssignmentDetailPage } from './pages/TaskAssignmentDetailPage.js';
import { TasksPage } from './pages/TasksPage.js';
import { ROUTES } from './config/constants.js';

export function App(): ReactNode {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppDataProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path={ROUTES.home} element={<HomePage />} />
              <Route path={ROUTES.dimensions} element={<DimensionsPage />} />
              <Route path={ROUTES.policies} element={<PoliciesPage />} />
              <Route path={ROUTES.tasks} element={<TasksPage />} />
              <Route path={ROUTES.models} element={<ModelsPage />} />
              <Route path={ROUTES.assignments} element={<AssignmentsPage />} />
              <Route path="/assignments/:taskId" element={<TaskAssignmentDetailPage />} />
              <Route path={ROUTES.changeImpacts} element={<ChangeImpactsPage />} />
              <Route path={ROUTES.orgView} element={<OrgViewPage />} />
            </Route>
          </Routes>
        </AppDataProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
