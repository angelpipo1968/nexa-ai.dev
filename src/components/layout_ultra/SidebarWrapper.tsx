'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { useUIStore } from '@/store/useUIStore';

export default function SidebarWrapper() {
    const { isSettingsOpen, setSettingsOpen } = useUIStore();

    return (
        <>
            <Sidebar />
            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setSettingsOpen(false)} 
            />
        </>
    );
}
