import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { getWebContainer } from '@/lib/webcontainer';
import 'xterm/css/xterm.css';
import { Terminal as TerminalIcon, X, ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onServerReady?: (url: string) => void;
}

export function WebContainerTerminal({ projectId, isOpen, onClose, onServerReady }: Props) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const xtermRef = useRef<Terminal | null>(null);
  const hasBootedRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !terminalRef.current || hasBootedRef.current) return;
    hasBootedRef.current = true;

    const term = new Terminal({
      theme: {
        background: '#090A0C',
        foreground: '#F4F4F5',
        cursor: '#4F46E5'
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 12,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    xtermRef.current = term;

    term.write('Welcome to Zovaix WebContainer Shell v1.0\r\n');
    term.write('Fetching project VFS from cloud...\r\n');

    async function startShell() {
      try {
        // 1. Fetch file tree from the backend API
        const res = await fetch(`/api/projects/${projectId}/vfs`);
        if (!res.ok) throw new Error('Failed to fetch Virtual File System');
        const fileTree = await res.json();
        
        term.write('Booting micro-OS...\r\n');
        const wc = await getWebContainer();
        
        // 2. Mount files
        term.write('Mounting files...\r\n');
        await wc.mount(fileTree);
        
        // 3. Listen for dev server ready event
        wc.on('server-ready', (port, url) => {
          term.write(`\r\n\x1b[32mLocal dev server ready at ${url}\x1b[0m\r\n`);
          if (onServerReady) onServerReady(url);
        });

        // 4. Run `npm install`
        term.write('\r\n\x1b[36m$ npm install\x1b[0m\r\n');
        const installProcess = await wc.spawn('npm', ['install']);
        installProcess.output.pipeTo(new WritableStream({ write(data) { term.write(data); }}));
        const installExitCode = await installProcess.exit;

        if (installExitCode !== 0) {
          throw new Error('npm install failed');
        }

        // 5. Run `npm run dev`
        term.write('\r\n\x1b[36m$ npm run dev\x1b[0m\r\n');
        const devProcess = await wc.spawn('npm', ['run', 'dev']);
        devProcess.output.pipeTo(new WritableStream({ write(data) { term.write(data); }}));

      } catch (err) {
        term.write(`\r\n\x1b[31mError starting shell: ${String(err)}\x1b[0m\r\n`);
      }
    }

    startShell();

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      xtermRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-200 border-t shadow-2xl flex flex-col ${
        isMinimized ? "h-10" : "h-64 sm:h-72"
      }`}
      style={{ background: "#090A0C", borderColor: "rgba(255, 255, 255, 0.08)" }}
    >
      {/* Terminal Title Bar */}
      <div className="h-10 px-4 flex items-center justify-between shrink-0 border-b select-none" style={{ borderColor: "rgba(255, 255, 255, 0.08)" }}>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <TerminalIcon className="h-4 w-4 text-primary" />
          </div>
          <span className="font-mono text-xs font-semibold text-foreground tracking-tight">Zovaix WebContainer Shell</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
            {isMinimized ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* XTerm Container */}
      {!isMinimized && (
        <div className="flex-1 w-full h-full overflow-hidden p-2" ref={terminalRef} />
      )}
    </div>
  );
}
