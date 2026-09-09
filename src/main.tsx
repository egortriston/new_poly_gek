import { OopProgramData } from './pages/OopProgramData';
import { Oop } from './pages/Oop';
import { AttestationHub, AttestationPage } from './pages/Attestation';
import { CatalogHub, CatalogTable } from './pages/Catalog';
import { Archive } from './pages/Archive';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate, useRouteError } from 'react-router-dom';
import { StoreProvider } from './store';
import { Layout, Logout } from './components/Layout';
import { Login } from './pages/Login';
import { Commissions, NewCommission } from './pages/Commissions';
import { CommissionDetail } from './pages/CommissionDetail';
import { PeopleTable } from './pages/PeopleTable';
import { Home, DataHub, PeopleHub, GekHub, GekDocuments, Unavailable } from './pages/Hubs';
import '@fontsource-variable/inter';
import '@fontsource-variable/manrope';
import './styles.css';
function ErrorPage() { useRouteError(); return <main className="fatal-error"><h1>Не удалось открыть страницу</h1><p>Сохранённые демоданные остаются в браузере.</p><a className="button primary" href="/commissions">Вернуться к комиссиям</a></main>; }
const router = createBrowserRouter([{ path: '/login', element: <Login/>, errorElement: <ErrorPage/> }, { path: '/', element: <Layout/>, errorElement: <ErrorPage/>, children: [{ index: true, element: <Home/> }, { path: 'commissions', element: <Commissions/> }, { path: 'commissions/new', element: <NewCommission/> }, { path: 'commissions/:id', element: <CommissionDetail/> }, { path: 'people', element: <Navigate to="/data/people" replace/> }, { path: 'oop', element: <Oop/> }, { path: 'oop/data/programs', element: <OopProgramData/> }, { path: 'oop/data/programs/:table', element: <OopProgramData/> }, { path: 'oop/:section', element: <Oop/> }, { path: 'attestation', element: <AttestationHub/> }, { path: 'attestation/:kind/:view', element: <AttestationPage/> }, { path: 'attestation/:kind', element: <AttestationPage/> }, { path: 'gek', element: <GekHub/> }, { path: 'gek/documents', element: <GekDocuments/> }, { path: 'data', element: <DataHub/> }, { path: 'data/people', element: <PeopleHub/> }, { path: 'data/structure', element: <CatalogHub group="structure"/> }, { path: 'data/education', element: <CatalogHub group="education"/> }, { path: 'data/catalog/:kind', element: <CatalogTable/> }, { path: 'data/people/:category', element: <PeopleTable/> }, { path: 'archive', element: <Archive/> }, { path: ':module', element: <Unavailable/> }, { path: 'logout', element: <Logout/> }, { path: '*', element: <Home/> }] }]);
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><StoreProvider><RouterProvider router={router}/></StoreProvider></React.StrictMode>);

