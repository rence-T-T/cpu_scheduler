import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Main App Component
function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('');
  const [processes, setProcesses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [numProcesses, setNumProcesses] = useState(3);
  const [timeQuantum, setTimeQuantum] = useState(2);

  const handleAlgorithmSelect = (algorithm) => {
    setSelectedAlgorithm(algorithm);
    setShowModal(true);
  };

  const handleModalSubmit = () => {
    setShowModal(false);
    setCurrentPage('visualization');
  };

  if (currentPage === 'visualization') {
    return (
      <VisualizationPage 
        algorithm={selectedAlgorithm}
        processes={processes}
        setProcesses={setProcesses}
        timeQuantum={timeQuantum}
        setTimeQuantum={setTimeQuantum}
        goBack={() => setCurrentPage('home')}
      />
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>CPU Scheduling Visualizer</h1>
      </header>

      <div className="container">
        <div className="scheduling-types">
          <div className="type-section">
            <h2>Non-Preemptive Scheduling</h2>
            <div className="button-group">
              <button onClick={() => handleAlgorithmSelect('FCFS')} className="schedule-btn">
                First Come First Serve (FCFS)
              </button>
              <button onClick={() => handleAlgorithmSelect('SJF')} className="schedule-btn">
                Shortest Job First (SJF)
              </button>
              <button onClick={() => handleAlgorithmSelect('Priority-NP')} className="schedule-btn">
                Priority Scheduling (Non-Preemptive)
              </button>
            </div>
          </div>

          <div className="type-section">
            <h2>Preemptive Scheduling</h2>
            <div className="button-group">
              <button onClick={() => handleAlgorithmSelect('RR')} className="schedule-btn">
                Round Robin (RR)
              </button>
              <button onClick={() => handleAlgorithmSelect('SRTF')} className="schedule-btn">
                Shortest Remaining Time First (SRTF)
              </button>
              <button onClick={() => handleAlgorithmSelect('Priority-P')} className="schedule-btn">
                Priority Scheduling (Preemptive)
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <ProcessInputModal
          algorithm={selectedAlgorithm}
          numProcesses={numProcesses}
          setNumProcesses={setNumProcesses}
          processes={processes}
          setProcesses={setProcesses}
          timeQuantum={timeQuantum}
          setTimeQuantum={setTimeQuantum}
          onClose={() => setShowModal(false)}
          onSubmit={handleModalSubmit}
        />
      )}
    </div>
  );
}

// Modal Component for Process Input
function ProcessInputModal({ algorithm, numProcesses, setNumProcesses, processes, setProcesses, timeQuantum, setTimeQuantum, onClose, onSubmit }) {
  const [localProcesses, setLocalProcesses] = useState([]);

  useEffect(() => {
    const newProcesses = Array.from({ length: numProcesses }, (_, i) => ({
      id: `P${i + 1}`,
      arrivalTime: 0,
      burstTime: 1,
      priority: 1,
      remainingTime: 1,
      color: `hsl(${(i * 360) / numProcesses}, 70%, 60%)`
    }));
    setLocalProcesses(newProcesses);
  }, [numProcesses]);

  const handleProcessChange = (index, field, value) => {
    const updated = [...localProcesses];
    updated[index][field] = parseInt(value) || 0;
    if (field === 'burstTime') {
      updated[index].remainingTime = parseInt(value) || 0;
    }
    setLocalProcesses(updated);
  };

  const handleSubmit = () => {
    setProcesses(localProcesses);
    onSubmit();
  };

  const isPriorityAlgorithm = algorithm === 'Priority-NP' || algorithm === 'Priority-P';
  const isRoundRobin = algorithm === 'RR';

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Configure {algorithm} Scheduling</h2>
        
        <div className="input-group">
          <label>Number of Processes:</label>
          <input 
            type="number" 
            min="1" 
            max="10" 
            value={numProcesses}
            onChange={(e) => setNumProcesses(parseInt(e.target.value) || 1)}
          />
        </div>

        {isRoundRobin && (
          <div className="input-group">
            <label>Time Quantum (ms):</label>
            <input 
              type="number" 
              min="1" 
              max="10" 
              value={timeQuantum}
              onChange={(e) => setTimeQuantum(parseInt(e.target.value) || 1)}
            />
          </div>
        )}

        <div className="processes-input">
          <h3>Process Details</h3>
          <table>
            <thead>
              <tr>
                <th>Process</th>
                <th>Arrival Time (ms)</th>
                <th>CPU Burst Time (ms)</th>
                {isPriorityAlgorithm && <th>Priority</th>}
              </tr>
            </thead>
            <tbody>
              {localProcesses.map((process, index) => (
                <tr key={index}>
                  <td>{process.id}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={process.arrivalTime}
                      onChange={(e) => handleProcessChange(index, 'arrivalTime', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      value={process.burstTime}
                      onChange={(e) => handleProcessChange(index, 'burstTime', e.target.value)}
                    />
                  </td>
                  {isPriorityAlgorithm && (
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={process.priority}
                        onChange={(e) => handleProcessChange(index, 'priority', e.target.value)}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="modal-buttons">
          <button onClick={onClose} className="cancel-btn">Cancel</button>
          <button onClick={handleSubmit} className="submit-btn">Start Visualization</button>
        </div>
      </div>
    </div>
  );
}

// Visualization Page Component
function VisualizationPage({ algorithm, processes, setProcesses, timeQuantum, setTimeQuantum, goBack }) {
  const [ganttChart, setGanttChart] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [readyQueue, setReadyQueue] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const animationRef = useRef();

  useEffect(() => {
    if (processes.length > 0) {
      const chart = generateGanttChart(algorithm, processes, timeQuantum);
      setGanttChart(chart);
    }
  }, [algorithm, processes, timeQuantum]);

  useEffect(() => {
    updateReadyQueue();
  }, [currentTime, processes]);

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const maxTime = ganttChart.length > 0 ? ganttChart[ganttChart.length - 1].endTime : 0;
          if (prev >= maxTime) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 100);
    } else {
      clearInterval(animationRef.current);
    }

    return () => clearInterval(animationRef.current);
  }, [isPlaying, ganttChart]);

  const updateReadyQueue = () => {
    const queue = processes.filter(p => p.arrivalTime <= currentTime).map(p => p.id);
    setReadyQueue(queue);
  };

  const generateGanttChart = (algo, procs, quantum) => {
    let chart = [];
    let time = 0;
    let processQueue = [...procs].map(p => ({ ...p }));
    
    switch(algo) {
      case 'FCFS':
        processQueue.sort((a, b) => a.arrivalTime - b.arrivalTime);
        processQueue.forEach(process => {
          if (time < process.arrivalTime) {
            time = process.arrivalTime;
          }
          chart.push({
            process: process.id,
            startTime: time,
            endTime: time + process.burstTime,
            color: process.color
          });
          time += process.burstTime;
        });
        break;
        
      case 'SJF':
        while (processQueue.length > 0) {
          const available = processQueue.filter(p => p.arrivalTime <= time);
          if (available.length === 0) {
            time++;
            continue;
          }
          available.sort((a, b) => a.burstTime - b.burstTime);
          const process = available[0];
          chart.push({
            process: process.id,
            startTime: time,
            endTime: time + process.burstTime,
            color: process.color
          });
          time += process.burstTime;
          processQueue = processQueue.filter(p => p.id !== process.id);
        }
        break;
        
      case 'RR':
        let queue = [];
        let completed = [];
        
        while (completed.length < procs.length) {
          // Add newly arrived processes to queue
          processQueue.forEach(p => {
            if (p.arrivalTime === time && !queue.find(q => q.id === p.id) && !completed.includes(p.id)) {
              queue.push({ ...p });
            }
          });
          
          if (queue.length === 0) {
            time++;
            continue;
          }
          
          const process = queue.shift();
          const executeTime = Math.min(quantum, process.remainingTime);
          
          chart.push({
            process: process.id,
            startTime: time,
            endTime: time + executeTime,
            color: process.color
          });
          
          time += executeTime;
          process.remainingTime -= executeTime;
          
          // Add processes that arrived during execution
          processQueue.forEach(p => {
            if (p.arrivalTime > time - executeTime && p.arrivalTime <= time && 
                !queue.find(q => q.id === p.id) && !completed.includes(p.id) && p.id !== process.id) {
              queue.push({ ...p });
            }
          });
          
          if (process.remainingTime > 0) {
            queue.push(process);
          } else {
            completed.push(process.id);
          }
        }
        break;
        
      case 'Priority-NP':
        processQueue.sort((a, b) => a.arrivalTime - b.arrivalTime || a.priority - b.priority);
        while (processQueue.length > 0) {
          const available = processQueue.filter(p => p.arrivalTime <= time);
          if (available.length === 0) {
            time++;
            continue;
          }
          available.sort((a, b) => a.priority - b.priority);
          const process = available[0];
          chart.push({
            process: process.id,
            startTime: time,
            endTime: time + process.burstTime,
            color: process.color
          });
          time += process.burstTime;
          processQueue = processQueue.filter(p => p.id !== process.id);
        }
        break;
        
      default:
        break;
    }
    
    return chart;
  };

  const handleProcessUpdate = (index, field, value) => {
    const updated = [...processes];
    updated[index][field] = parseInt(value) || 0;
    if (field === 'burstTime') {
      updated[index].remainingTime = parseInt(value) || 0;
    }
    setProcesses(updated);
  };

  const isPriorityAlgorithm = algorithm === 'Priority-NP' || algorithm === 'Priority-P';

  return (
    <div className="visualization-page">
      <header className="viz-header">
        <button onClick={goBack} className="back-btn">← Back</button>
        <h1>{algorithm} Scheduling Visualization</h1>
      </header>

      <div className="controls">
        <button onClick={() => setCurrentTime(Math.max(0, currentTime - 1))} className="control-btn">
          &lt; Previous
        </button>
        <button onClick={() => setIsPlaying(!isPlaying)} className="control-btn play-btn">
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button onClick={() => setCurrentTime(currentTime + 1)} className="control-btn">
          Next &gt;
        </button>
        <span className="time-display">Time: {currentTime} ms</span>
      </div>

      <div className="gantt-container">
        <h2>Gantt Chart</h2>
        <div className="gantt-chart">
          <div className="gantt-bars">
            {ganttChart.map((item, index) => (
              <div
                key={index}
                className={`gantt-bar ${currentTime >= item.startTime && currentTime < item.endTime ? 'active' : ''}`}
                style={{
                  left: `${item.startTime * 20}px`,
                  width: `${(item.endTime - item.startTime) * 20}px`,
                  backgroundColor: item.color,
                  opacity: currentTime >= item.endTime ? 0.7 : 1
                }}
              >
                <span>{item.process}</span>
              </div>
            ))}
          </div>
          <div className="time-axis">
            {Array.from({ length: Math.max(61, currentTime + 10) }, (_, i) => i).map(i => (
              i % 5 === 0 && (
                <span key={i} className="time-mark" style={{ left: `${i * 20}px` }}>
                  {i}
                </span>
              )
            ))}
          </div>
        </div>
      </div>

      <div className="ready-queue">
        <h3>Ready Queue at Time {currentTime} ms</h3>
        <div className="queue-items">
          {readyQueue.length > 0 ? (
            readyQueue.map(pid => (
              <div key={pid} className="queue-item">
                {pid}
              </div>
            ))
          ) : (
            <div className="empty-queue">No processes in ready queue</div>
          )}
        </div>
      </div>

      <div className="process-editor">
        <div className="editor-header">
          <h3>Process Configuration</h3>
          <button onClick={() => setEditMode(!editMode)} className="edit-btn">
            {editMode ? 'Save' : 'Edit'}
          </button>
        </div>
        
        {algorithm === 'RR' && editMode && (
          <div className="quantum-edit">
            <label>Time Quantum (ms): </label>
            <input 
              type="number" 
              min="1" 
              value={timeQuantum}
              onChange={(e) => setTimeQuantum(parseInt(e.target.value) || 1)}
            />
          </div>
        )}

        <table className="process-table">
          <thead>
            <tr>
              <th>Process</th>
              <th>Arrival Time (ms)</th>
              <th>CPU Burst Time (ms)</th>
              {isPriorityAlgorithm && <th>Priority</th>}
            </tr>
          </thead>
          <tbody>
            {processes.map((process, index) => (
              <tr key={index}>
                <td>{process.id}</td>
                <td>
                  {editMode ? (
                    <input
                      type="number"
                      min="0"
                      value={process.arrivalTime}
                      onChange={(e) => handleProcessUpdate(index, 'arrivalTime', e.target.value)}
                    />
                  ) : (
                    process.arrivalTime
                  )}
                </td>
                <td>
                  {editMode ? (
                    <input
                      type="number"
                      min="1"
                      value={process.burstTime}
                      onChange={(e) => handleProcessUpdate(index, 'burstTime', e.target.value)}
                    />
                  ) : (
                    process.burstTime
                  )}
                </td>
                {isPriorityAlgorithm && (
                  <td>
                    {editMode ? (
                      <input
                        type="number"
                        min="1"
                        value={process.priority}
                        onChange={(e) => handleProcessUpdate(index, 'priority', e.target.value)}
                      />
                    ) : (
                      process.priority
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;