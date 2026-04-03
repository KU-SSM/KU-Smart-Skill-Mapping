import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineClose, AiOutlinePlus } from 'react-icons/ai';
import { FiSave, FiX } from 'react-icons/fi';
import './RubricScore.css';
import { getRubricScores, createRubricScore, deleteRubricScore } from '../services/rubricScoreApi';
import { getApiErrorDetail } from '../utils/apiErrors';

const CloseIcon = AiOutlineClose as React.ComponentType;
const PlusIcon = AiOutlinePlus as React.ComponentType;
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [rubricScores, setRubricScores] = useState<RubricScore[]>([]);
  const [originalRubricScores, setOriginalRubricScores] = useState<RubricScore[]>([]); // Store original state for cancel
  const [deletedRubricIds, setDeletedRubricIds] = useState<Set<string>>(new Set()); // Track deleted rubric IDs

  // Load rubric scores from API on component mount
  useEffect(() => {
    const loadRubricScores = async () => {
      try {
        setIsLoading(true);
        console.log('📥 Loading rubric scores from API...');
        const scores = await getRubricScores();
        console.log('✅ Loaded rubric scores:', scores);
        const normalized = scores.map(score => ({ ...score, isNew: false }));
        setRubricScores(normalized);
        setOriginalRubricScores(normalized);
      } catch (error: unknown) {
        console.error('❌ Error loading rubric scores:', error);
        alert(`Error: ${getApiErrorDetail(error) || 'Failed to load rubric scores'}`);
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
    return rubricScores.some(rubric => rubric.isNew === true) || deletedRubricIds.size > 0;
  }, [rubricScores, deletedRubricIds]);

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
    navigate(`/rubric_score/${id}`);
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
    
    if (newRubricScores.length === 0 && deletedIds.length === 0) {
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
      console.log('───────────────────────────────────────────────────────');

      const savedScores: RubricScore[] = [];
      const errors: string[] = [];
      const deletedCount: number[] = [];

      // First, delete items from backend
      for (let i = 0; i < deletedIds.length; i++) {
        const id = deletedIds[i];
        try {
          console.log(`\n[${i + 1}/${deletedIds.length}] Deleting rubric ID: ${id}`);
          await deleteRubricScore(id);
          deletedCount.push(1);
          console.log(`Successfully deleted rubric ID: ${id}`);
        } catch (error: unknown) {
          console.error(`Failed to delete rubric ID ${id}:`, error);
          errors.push(`Delete ${id}: ${getApiErrorDetail(error) || 'Unknown error'}`);
        }
      }

      // Then, create new items
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
        } catch (error: unknown) {
          console.error(`Failed to save "${rubric.title}":`, error);
          errors.push(`${rubric.title}: ${getApiErrorDetail(error) || 'Unknown error'}`);
        }
      }

      console.log('───────────────────────────────────────────────────────');
      console.log('SAVE SUMMARY:');
      console.log(`   Successfully saved: ${savedScores.length}`);
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
      
      // Re-sync from backend so deletes/renames are reflected immediately (and persist after refresh)
      try {
        console.log('\n📥 Refreshing rubric score list from backend after save...');
        const refreshed = await getRubricScores();
        console.log('✅ Refreshed rubric scores:', refreshed);
        setRubricScores(refreshed.map(score => ({ ...score, isNew: false })));
        // Also refresh the "original" snapshot so Cancel works correctly after a save
        setOriginalRubricScores(refreshed.map(score => ({ ...score, isNew: false })));
      } catch (refreshError) {
        console.warn('⚠️ Failed to refresh rubric scores after save. Keeping local state.', refreshError);
        // If refresh fails, fall back to local updatedScores
        setOriginalRubricScores(updatedScores);
      }
      
      // Clear deleted IDs since we've attempted to save them
      setDeletedRubricIds(new Set());

      if (errors.length === 0) {
        console.log(`Successfully saved ${savedScores.length} rubric score(s) and deleted ${deletedCount.length} rubric score(s)!`);
      } else {
        console.warn(`Saved ${savedScores.length} and deleted ${deletedCount.length}, but ${errors.length} failed. Check console for details.`);
      }
    } catch (error: any) {
      console.error('Error saving rubric scores:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Cancel changes without saving: restore original state
    const restoredScores = [...originalRubricScores];
    setRubricScores(restoredScores);
    setDeletedRubricIds(new Set());
  };

  const handleAddNew = () => {
    const newId = `new-${Date.now()}`; // Prefix with 'new-' to identify as new
    const newRubric: RubricScore = {
      id: newId,
      title: 'New Rubric Score',
      isNew: true // Mark as new (not yet saved to backend)
    };
    setRubricScores([...rubricScores, newRubric]);
  };

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
        <div className="rubric-score-bars-container rubric-score-bars-container--scrollable">
          {filteredRubricScores.map((rubric) => (
            <div
              key={rubric.id}
              className="rubric-score-bar"
              onClick={() => handleBarClick(rubric.id)}
            >
              <button
                className="rubric-score-bar-delete-button"
                onClick={(e) => handleDeleteRubric(e, rubric.id)}
                title="Delete rubric score"
              >
                {React.createElement(CloseIcon)}
              </button>
              <span className="rubric-score-bar-title">{rubric.title}</span>
            </div>
          ))}
          {!searchQuery.trim() && (
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
            disabled={isSaving || !hasNewRubricScores}
          >
            {React.createElement(CancelIcon)}
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RubricScoreList;
