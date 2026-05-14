import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-2">AI Agenten</h2>
          <ul>
            <li>Agent 1: Status aktiv</li>
            <li>Agent 2: Status inaktiv</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
