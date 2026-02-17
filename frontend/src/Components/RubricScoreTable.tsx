import React, { useRef, useEffect } from 'react';
import { AiOutlinePlus, AiOutlineClose } from 'react-icons/ai';
import './RubricScore.css';

const PlusIcon = AiOutlinePlus as React.ComponentType;
const CloseIcon = AiOutlineClose as React.ComponentType;

interface TableData {
  skillArea: string;
  values: string[];
}

interface RubricScoreTableProps {
  headers: string[];
  rows: TableData[];
  onHeadersChange: (headers: string[]) => void;
  onRowsChange: (rows: TableData[]) => void;
  onSave?: () => void;
  readOnly?: boolean;
}

const RubricScoreTable: React.FC<RubricScoreTableProps> = ({
  headers,
  rows,
  onHeadersChange,
  onRowsChange,
  onSave,
  readOnly = false,
}) => {
  const handleHeaderChange = (index: number, value: string) => {
    if (readOnly) return;
    const newHeaders = [...headers];
    newHeaders[index] = value;
    onHeadersChange(newHeaders);
  };

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    if (readOnly) return;
    const newRows = [...rows];
    newRows[rowIndex].values[colIndex] = value;
    onRowsChange(newRows);
  };

  const handleSkillAreaChange = (rowIndex: number, value: string) => {
    if (readOnly) return;
    const newRows = [...rows];
    newRows[rowIndex].skillArea = value;
    onRowsChange(newRows);
  };

  const addColumn = () => {
    if (readOnly) return;
    const newHeaders = [...headers, `Score ${headers.length + 1}`];
    onHeadersChange(newHeaders);
    const newRows = rows.map(row => ({
      ...row,
      values: [...row.values, '']
    }));
    onRowsChange(newRows);
  };

  const addRow = () => {
    if (readOnly) return;
    const newRows = [...rows, {
      skillArea: '',
      values: Array(headers.length).fill('')
    }];
    onRowsChange(newRows);
  };

  const deleteColumn = (colIndex: number) => {
    if (readOnly) return;
    const newHeaders = headers.filter((_, index) => index !== colIndex);
    onHeadersChange(newHeaders);
    const newRows = rows.map(row => ({
      ...row,
      values: row.values.filter((_, index) => index !== colIndex)
    }));
    onRowsChange(newRows);
  };

  const deleteRow = (rowIndex: number) => {
    if (readOnly) return;
    const newRows = rows.filter((_, index) => index !== rowIndex);
    onRowsChange(newRows);
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

  const isTableEmpty = headers.length === 0 && rows.length === 0;

  return (
    <div className="table-container">
      <div className="table-wrapper" ref={tableWrapperRef}>
        <table className={`rubric-table ${isTableEmpty ? 'table-empty' : ''}`}>
          <thead>
            <tr>
              <th className="fixed-column">Skill Area</th>
              {headers.map((header, index) => (
                <th key={index} className="header-with-delete">
                  <div className="header-content">
                    <textarea
                      value={header}
                      onChange={(e) => handleHeaderChange(index, e.target.value)}
                      className="editable-header"
                      rows={1}
                      readOnly={readOnly}
                    />
                    {!readOnly && (
                      <button 
                        className="delete-button delete-column-button" 
                        onClick={() => deleteColumn(index)} 
                        title="Delete Column"
                      >
                        {React.createElement(CloseIcon)}
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {!readOnly && (
                <th className="add-column-cell">
                  <button className="add-button" onClick={addColumn} title="Add Column">
                    {React.createElement(PlusIcon)}
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="fixed-column">
                  <div className="skill-area-with-delete">
                    <textarea
                      value={row.skillArea}
                      onChange={(e) => handleSkillAreaChange(rowIndex, e.target.value)}
                      className="editable-cell"
                      placeholder="Skill Area"
                      rows={1}
                      readOnly={readOnly}
                    />
                    {!readOnly && (
                      <button 
                        className="delete-button delete-row-button" 
                        onClick={() => deleteRow(rowIndex)} 
                        title="Delete Row"
                      >
                        {React.createElement(CloseIcon)}
                      </button>
                    )}
                  </div>
                </td>
                {row.values.map((value, colIndex) => (
                  <td key={colIndex}>
                    <textarea
                      value={value}
                      onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                      className="editable-cell"
                      placeholder="-"
                      rows={1}
                      readOnly={readOnly}
                    />
                  </td>
                ))}
                {!readOnly && <td className="add-column-cell"></td>}
              </tr>
            ))}
            {!readOnly && (
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
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RubricScoreTable;
