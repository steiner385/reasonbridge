import React from 'react';
import { LoadingBridge } from '../../components/ui';

/**
 * Demo page for the LoadingBridge animation component.
 * Visit /demo/loading to preview.
 */
const LoadingDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">LoadingBridge Animation</h1>
        <p className="text-slate-400 mb-8">
          Two perspectives coming together, finding common ground, and that moment of unity flashing
          like a moment of understanding.
        </p>

        {/* Size Variants */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">Size Variants</h2>
          <div className="flex items-end gap-8 p-8 bg-slate-800/50 rounded-xl">
            <div className="text-center">
              <LoadingBridge size="sm" />
              <p className="text-slate-400 text-sm mt-2">sm (32px)</p>
            </div>
            <div className="text-center">
              <LoadingBridge size="md" />
              <p className="text-slate-400 text-sm mt-2">md (48px)</p>
            </div>
            <div className="text-center">
              <LoadingBridge size="lg" />
              <p className="text-slate-400 text-sm mt-2">lg (64px)</p>
            </div>
            <div className="text-center">
              <LoadingBridge size="xl" />
              <p className="text-slate-400 text-sm mt-2">xl (96px)</p>
            </div>
          </div>
        </section>

        {/* On Light Background */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">Light Background</h2>
          <div className="flex items-center justify-center gap-8 p-12 bg-white rounded-xl">
            <LoadingBridge size="lg" />
            <LoadingBridge size="xl" />
          </div>
        </section>

        {/* In Context */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">In Context - Loading Card</h2>
          <div className="bg-white rounded-xl p-8 max-w-md mx-auto shadow-xl">
            <div className="flex flex-col items-center text-center">
              <LoadingBridge size="lg" />
              <p className="text-slate-600 mt-4 font-medium">Finding common ground...</p>
              <p className="text-slate-400 text-sm mt-1">Analyzing perspectives</p>
            </div>
          </div>
        </section>

        {/* Full Page Overlay Example */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Full Page Overlay</h2>
          <div className="relative bg-slate-700 rounded-xl h-64 overflow-hidden">
            {/* Simulated page content */}
            <div className="p-4 opacity-30">
              <div className="h-4 bg-slate-500 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-slate-500 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-slate-500 rounded w-2/3"></div>
            </div>
            {/* Overlay */}
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <LoadingBridge size="xl" />
                <p className="text-white mt-4 font-medium">Processing your request...</p>
              </div>
            </div>
          </div>
        </section>

        {/* Usage */}
        <section className="mt-12 p-6 bg-slate-800/50 rounded-xl">
          <h2 className="text-xl font-semibold text-white mb-4">Usage</h2>
          <pre className="text-sm text-slate-300 overflow-x-auto">
            {`import { LoadingBridge } from '@/components/ui';

// Basic usage
<LoadingBridge />

// With size
<LoadingBridge size="lg" />

// With custom label for accessibility
<LoadingBridge size="md" label="Analyzing discussion..." />

// Available sizes: 'sm' (32px), 'md' (48px), 'lg' (64px), 'xl' (96px)`}
          </pre>
        </section>
      </div>
    </div>
  );
};

export default LoadingDemo;
