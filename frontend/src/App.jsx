import { Routes, Route } from "react-router-dom";
import { AppShell, Group, Title, Text, NavLink, Box } from "@mantine/core";
import { IconLayoutKanban, IconActivity, IconFolders } from "@tabler/icons-react";
import { Link, useLocation } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import ProjectDetail from "./pages/ProjectDetail";
import ActivityFeed from "./pages/ActivityFeed";

function Nav() {
  const { pathname } = useLocation();
  return (
    <>
      <NavLink
        component={Link}
        to="/"
        label="Projects"
        leftSection={<IconFolders size={18} />}
        active={pathname === "/"}
      />
      <NavLink
        component={Link}
        to="/activity"
        label="Activity"
        leftSection={<IconActivity size={18} />}
        active={pathname === "/activity"}
      />
    </>
  );
}

export default function App() {
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 240, breakpoint: "sm" }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" gap="xs">
          <IconLayoutKanban size={26} color="var(--mantine-color-indigo-6)" />
          <Title order={3} c="indigo.7">
            Inaya
          </Title>
          <Text size="sm" c="dimmed" ml={4}>
            Project Management & Collaboration
          </Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <Nav />
      </AppShell.Navbar>

      <AppShell.Main>
        <Box maw={1400} mx="auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/activity" element={<ActivityFeed />} />
          </Routes>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}