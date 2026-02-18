import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineClose, AiOutlinePlus, AiOutlineEdit, AiOutlineCheck } from 'react-icons/ai';
import { FiSave, FiX } from 'react-icons/fi';
import './RubricScore.css';
import { getRubricScores, createRubricScore, deleteRubricScore, updateRubricName } from '../services/rubricScoreApi';

const CloseIcon = AiOutlineClose as React.ComponentType;
const PlusIcon = AiOutlinePlus as React.ComponentType;
const EditIcon = AiOutlineEdit as React.ComponentType;
const CheckIcon = AiOutlineCheck as React.ComponentType;
const SaveIcon = FiSave as React.ComponentType;
const CancelIcon = FiX as React.ComponentType;

interface RubricScore {
  id: string;
  title: string;
  isNew?: boolean; // Track if this is a new rubric score not yet saved to backend
}

const RubricScoreList: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [rubricScores, setRubricScores] = useState<RubricScore[]>([]);
  const [originalRubricScores, setOriginalRubricScores] = useState<RubricScore[]>([]); // Store original state when entering edit mode
  const [deletedRubricIds, setDeletedRubricIds] = useState<Set<string>>(new Set()); // Track deleted rubric IDs
  const [renamedRubrics, setRenamedRubrics] = useState<Map<string, string>>(new Map()); // Track renamed rubrics: id -> newTitle

  // Load rubric scores from API on component mount
  useEffect(() => {
    const loadRubricScores = async () => {
      try {
        setIsLoading(true);
        console.log('📥 Loading rubric scores from API...');
        const scores = await getRubricScores();
        console.log('✅ Loaded rubric scores:', scores);
        setRubricScores(scores.map(score => ({ ...score, isNew: false })));
      } catch (error) {
        console.error('❌ Error loading rubric scores:', error);
        // If API fails, start with empty array
        setRubricScores([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRubricScores();
  }, []);

  // Check if there are any new (unsaved) rubric scores, deleted items, or renamed items
  const hasNewRubricScores = useMemo(() => {
    return rubricScores.some(rubric => rubric.isNew === true) || deletedRubricIds.size > 0 || renamedRubrics.size > 0;
  }, [rubricScores, deletedRubricIds, renamedRubrics]);

  const filteredRubricScores = useMemo(() => {
    if (!searchQuery.trim()) {
      return rubricScores;
    }
    const query = searchQuery.toLowerCase();
    return rubricScores.filter(rubric =>
      rubric.title.toLowerCase().includes(query)
    );
  }, [rubricScores, searchQuery]);

  const handleBarClick = (id: string) => {
    if (!isEditMode) {
      navigate(`/rubric_score/${id}`);
    } else {
      // Enable editing mode for this item
      const rubric = rubricScores.find(r => r.id === id);
      if (rubric) {
        setEditingId(id);
        setEditingTitle(rubric.title);
      }
    }
  };

  const handleEditMode = () => {
    if (isEditMode) {
      // Exiting edit mode - check if we should restore original state
      // Only restore if there are new rubric scores, deletions, or renames that weren't saved
      const hasUnsavedChanges = rubricScores.some(rubric => rubric.isNew === true) || deletedRubricIds.size > 0 || renamedRubrics.size > 0;
      
      if (hasUnsavedChanges) {
        // Restore original state, removing any newly added rubric scores and restoring deleted/renamed ones
        setRubricScores(originalRubricScores);
        setDeletedRubricIds(new Set());
        setRenamedRubrics(new Map());
      } else {
        // Save any ongoing edits before exiting edit mode
        if (editingId && editingTitle.trim()) {
          setRubricScores(rubricScores.map(rubric =>
            rubric.id === editingId
              ? { ...rubric, title: editingTitle.trim() }
              : rubric
          ));
        }
      }
      
      setEditingId(null);
      setEditingTitle('');
      setOriginalRubricScores([]); // Clear the stored original state
    } else {
      // Entering edit mode - save current state as original
      setOriginalRubricScores([...rubricScores]);
    }
    setIsEditMode(!isEditMode);
  };

  const handleDeleteRubric = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Remove from display
    setRubricScores(rubricScores.filter(rubric => rubric.id !== id));
    // Track deletion if it's not a new (unsaved) item
    const rubric = rubricScores.find(r => r.id === id);
    if (rubric && !rubric.isNew) {
      setDeletedRubricIds(prev => new Set(prev).add(id));
    }
  };

  const handleSave = async () => {
    const newRubricScores = rubricScores.filter(rubric => rubric.isNew === true);
    const deletedIds = Array.from(deletedRubricIds);
    const renamedIds = Array.from(renamedRubrics.keys());
    
    if (newRubricScores.length === 0 && deletedIds.length === 0 && renamedIds.length === 0) {
      console.log('ℹ️ No changes to save');
      return;
    }

    setIsSaving(true);

    try {
      console.log('═══════════════════════════════════════════════════════');
      console.log('SAVING CHANGES');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`Found ${newRubricScores.length} new rubric score(s) to save`);
      console.log(`Found ${deletedIds.length} rubric score(s) to delete`);
      console.log(`Found ${renamedIds.length} rubric score(s) to rename`);
      console.log('───────────────────────────────────────────────────────');

      const savedScores: RubricScore[] = [];
      const errors: string[] = [];
      const deletedCount: number[] = [];
      const updatedCount: number[] = [];

      // First, update renamed items
      for (let i = 0; i < renamedIds.length; i++) {
        const id = renamedIds[i];
        const newTitle = renamedRubrics.get(id);
        if (!newTitle) continue;
        
        try {
          console.log(`\n[${i + 1}/${renamedIds.length}] Updating rubric ID: ${id} to "${newTitle}"`);
          await updateRubricName(id, newTitle);
          updatedCount.push(1);
          console.log(`Successfully updated rubric ID: ${id}`);
        } catch (error: any) {
          console.error(`Failed to update rubric ID ${id}:`, error);
          errors.push(`Update ${id}: ${error?.message || 'Unknown error'}`);
        }
      }

      // Then, delete items from backend
      for (let i = 0; i < deletedIds.length; i++) {
        const id = deletedIds[i];
        try {
          console.log(`\n[${i + 1}/${deletedIds.length}] Deleting rubric ID: ${id}`);
          await deleteRubricScore(id);
          deletedCount.push(1);
          console.log(`Successfully deleted rubric ID: ${id}`);
        } catch (error: any) {
          console.error(`Failed to delete rubric ID ${id}:`, error);
          errors.push(`Delete ${id}: ${error?.message || 'Unknown error'}`);
        }
      }

      // Finally, create new items
      for (let i = 0; i < newRubricScores.length; i++) {
        const rubric = newRubricScores[i];
        try {
          console.log(`\n[${i + 1}/${newRubricScores.length}] Creating rubric: "${rubric.title}"`);
          
          // Create rubric with empty headers and rows (just the title)
          const result = await createRubricScore({
            title: rubric.title,
            headers: [],
            rows: []
          });

          console.log(`Successfully created rubric ID: ${result.id}`);
          savedScores.push({ ...rubric, id: result.id, isNew: false });
        } catch (error: any) {
          console.error(`Failed to save "${rubric.title}":`, error);
          errors.push(`${rubric.title}: ${error?.message || 'Unknown error'}`);
        }
      }

      console.log('───────────────────────────────────────────────────────');
      console.log('SAVE SUMMARY:');
      console.log(`   Successfully saved: ${savedScores.length}`);
      console.log(`   Successfully updated: ${updatedCount.length}`);
      console.log(`   Successfully deleted: ${deletedCount.length}`);
      console.log(`   Failed: ${errors.length}`);
      if (errors.length > 0) {
        console.log('   Errors:', errors);
      }
      console.log('═══════════════════════════════════════════════════════');

      // Update the rubric scores list - replace new ones with saved ones
      const updatedScores = [...rubricScores];
      
      savedScores.forEach(saved => {
        const index = updatedScores.findIndex(r => 
          (r.isNew && r.title === saved.title) || r.id === saved.id
        );
        if (index !== -1) {
          // Replace the new rubric with the saved one
          updatedScores[index] = saved;
        } else {
          // Add if not found (shouldn't happen, but just in case)
          updatedScores.push(saved);
        }
      });

      setRubricScores(updatedScores);
      
      // Clear deleted IDs, renamed rubrics, and original state since we've successfully saved
      setDeletedRubricIds(new Set());
      setRenamedRubrics(new Map());
      setOriginalRubricScores([]);

      if (errors.length === 0) {
        console.log(`Successfully saved ${savedScores.length} rubric score(s), updated ${updatedCount.length} rubric score(s), and deleted ${deletedCount.length} rubric score(s)!`);
      } else {
        console.warn(`Saved ${savedScores.length}, updated ${updatedCount.length}, and deleted ${deletedCount.length}, but ${errors.length} failed. Check console for details.`);
      }
    } catch (error: any) {
      console.error('Error saving rubric scores:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Cancel changes without saving - restore original state but stay in edit mode
    const restoredScores = [...originalRubricScores];
    setRubricScores(restoredScores); // Remove any newly added rubric scores
    setDeletedRubricIds(new Set()); // Clear deleted IDs
    setRenamedRubrics(new Map()); // Clear renamed rubrics
    setEditingId(null);
    setEditingTitle('');
    // Update originalRubricScores to the restored state so cancel can be used again
    setOriginalRubricScores(restoredScores);
    // Stay in edit mode - don't call setIsEditMode(false)
  };

  const handleAddNew = () => {
    const newId = `new-${Date.now()}`; // Prefix with 'new-' to identify as new
    const newRubric: RubricScore = {
      id: newId,
      title: 'New Rubric Score',
      isNew: true // Mark as new (not yet saved to backend)
    };
    setRubricScores([...rubricScores, newRubric]);
    setEditingId(newId);
    setEditingTitle('New Rubric Score');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    if (editingId && editingTitle.trim()) {
      const rubric = rubricScores.find(r => r.id === editingId);
      const newTitle = editingTitle.trim();
      
      // Update the display
      setRubricScores(rubricScores.map(rubric =>
        rubric.id === editingId
          ? { ...rubric, title: newTitle }
          : rubric
      ));
      
      // Track rename if it's an existing (non-new) item and the title changed
      if (rubric && !rubric.isNew && rubric.title !== newTitle) {
        setRenamedRubrics(prev => {
          const newMap = new Map(prev);
          newMap.set(editingId, newTitle);
          return newMap;
        });
      }
    }
    setEditingId(null);
    setEditingTitle('');
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingTitle('');
    }
  };

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  if (isLoading) {
    return (
      <div className="rubric-score-wrapper">
        <div className="rubric-score-container">
          <h1 className="rubric-score-title">Rubric Score</h1>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Loading rubric scores...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rubric-score-wrapper">
      <div className="rubric-score-container">
        <h1 className="rubric-score-title">Rubric Score</h1>
        <div className="rubric-score-search-container">
          <input
            type="text"
            className="rubric-score-search-input"
            placeholder="Search rubric scores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="rubric-score-clear-search"
              onClick={() => setSearchQuery('')}
            >
              {React.createElement(CloseIcon)}
            </button>
          )}
        </div>
        <div className="rubric-score-bars-container">
          {filteredRubricScores.map((rubric) => (
            <div
              key={rubric.id}
              className="rubric-score-bar"
              onClick={() => !isEditMode && handleBarClick(rubric.id)}
            >
              {isEditMode && (
                <button
                  className="rubric-score-bar-delete-button"
                  onClick={(e) => handleDeleteRubric(e, rubric.id)}
                >
                  {React.createElement(CloseIcon)}
                </button>
              )}
              {editingId === rubric.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  className="rubric-score-bar-title-input"
                  value={editingTitle}
                  onChange={handleTitleChange}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span 
                  className="rubric-score-bar-title"
                  onClick={(e) => {
                    if (isEditMode) {
                      e.stopPropagation();
                      handleBarClick(rubric.id);
                    }
                  }}
                >
                  {rubric.title}
                </span>
              )}
            </div>
          ))}
          {isEditMode && !searchQuery.trim() && (
            <div 
              className="rubric-score-add-box"
              onClick={handleAddNew}
            >
              <span className="rubric-score-add-box-spacer"></span>
              <button 
                className="rubric-score-add-box-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddNew();
                }}
                title="Add New Rubric Score"
              >
                {React.createElement(PlusIcon)}
              </button>
            </div>
          )}
        </div>
        <div className="rubric-score-list-button-container">
          {isEditMode && (
            <>
              <button 
                className="save-rubric-score-button"
                onClick={handleSave}
                disabled={!hasNewRubricScores || isSaving}
                style={{
                  opacity: (!hasNewRubricScores || isSaving) ? 0.5 : 1,
                  cursor: (!hasNewRubricScores || isSaving) ? 'not-allowed' : 'pointer'
                }}
              >
                {React.createElement(SaveIcon)}
                <span>{isSaving ? 'Saving...' : 'Save'}</span>
              </button>
              <button 
                className="cancel-rubric-score-button"
                onClick={handleCancel}
                disabled={isSaving}
              >
                {React.createElement(CancelIcon)}
                <span>Cancel</span>
              </button>
            </>
          )}
          <button 
            className="edit-rubric-score-button"
            onClick={handleEditMode}
          >
            {isEditMode ? (
              <>
                {React.createElement(CheckIcon)}
                <span>Done Editing</span>
              </>
            ) : (
              <>
                {React.createElement(EditIcon)}
                <span>Edit Rubric Score</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RubricScoreList;
