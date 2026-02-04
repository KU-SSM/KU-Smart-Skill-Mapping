import React, { useState, useRef, useEffect } from 'react';
import './RubricScore.css';
import { AiOutlinePlus } from 'react-icons/ai';

const PlusIcon = AiOutlinePlus as React.ComponentType;

interface TableData {
  skillArea: string;
  values: string[];
}

const RubricScore: React.FC = () => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<TableData[]>([]);

  const handleHeaderChange = (index: number, value: string) => {
    const newHeaders = [...headers];
    newHeaders[index] = value;
    setHeaders(newHeaders);
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newRows = [...rows];
    newRows[rowIndex].values[colIndex] = value;
    setRows(newRows);
  };

  const handleSkillAreaChange = (rowIndex: number, value: string) => {
    const newRows = [...rows];
    newRows[rowIndex].skillArea = value;
    setRows(newRows);
  };

  const addColumn = () => {
    setHeaders([...headers, `Score ${headers.length + 1}`]);
    setRows(rows.map(row => ({
      ...row,
      values: [...row.values, '']
    })));
  };

  const addRow = () => {
    setRows([...rows, {
      skillArea: '',
      values: Array(headers.length).fill('')
    }]);
  };

  const tableWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const textareas = document.querySelectorAll('.editable-cell, .editable-header');
    const autoResize = (textarea: HTMLTextAreaElement) => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };

    const handlers: Array<{ element: HTMLTextAreaElement; handler: () => void }> = [];

    textareas.forEach((textarea) => {
      const ta = textarea as HTMLTextAreaElement;
      const handler = () => autoResize(ta);
      ta.addEventListener('input', handler);
      autoResize(ta);
      handlers.push({ element: ta, handler });
    });

    return () => {
      handlers.forEach(({ element, handler }) => {
        element.removeEventListener('input', handler);
      });
    };
  }, [headers, rows]);

  useEffect(() => {
    const tableWrapper = tableWrapperRef.current;
    if (!tableWrapper) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        tableWrapper.scrollLeft += e.deltaX;
      }
    };

    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && tableWrapper.scrollWidth > tableWrapper.clientWidth) {
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartX);
        const deltaY = Math.abs(touch.clientY - touchStartY);
        
        if (deltaX > deltaY) {
          e.preventDefault();
        }
      }
    };

    tableWrapper.addEventListener('wheel', handleWheel, { passive: false });
    tableWrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
    tableWrapper.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      tableWrapper.removeEventListener('wheel', handleWheel);
      tableWrapper.removeEventListener('touchmove', handleTouchMove);
      tableWrapper.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  return (
    <div className="rubric-score-wrapper">
      <div className="rubric-score-container">
        <h1 className="rubric-score-title">Rubric Score</h1>
        <div className="table-container">
          <div className="table-wrapper" ref={tableWrapperRef}>
            <table className="rubric-table">
              <thead>
                <tr>
                  <th className="fixed-column">Skill Area</th>
                  {headers.map((header, index) => (
                    <th key={index}>
                      <textarea
                        value={header}
                        onChange={(e) => handleHeaderChange(index, e.target.value)}
                        className="editable-header"
                        rows={1}
                      />
                    </th>
                  ))}
                  <th className="add-column-cell">
                    <button className="add-button" onClick={addColumn} title="Add Column">
                      {React.createElement(PlusIcon)}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="fixed-column">
                      <textarea
                        value={row.skillArea}
                        onChange={(e) => handleSkillAreaChange(rowIndex, e.target.value)}
                        className="editable-cell"
                        placeholder="Skill Area"
                        rows={1}
                      />
                    </td>
                    {row.values.map((value, colIndex) => (
                      <td key={colIndex}>
                        <textarea
                          value={value}
                          onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                          className="editable-cell"
                          placeholder="-"
                          rows={1}
                        />
                      </td>
                    ))}
                    <td className="add-column-cell"></td>
                  </tr>
                ))}
                <tr className="add-row-row">
                  <td className="fixed-column add-row-cell">
                    <button className="add-button" onClick={addRow} title="Add Row">
                      {React.createElement(PlusIcon)}
                    </button>
                  </td>
                  {headers.map((_, colIndex) => (
                    <td key={colIndex} className="add-row-cell"></td>
                  ))}
                  <td className="add-column-cell add-row-cell"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RubricScore;
