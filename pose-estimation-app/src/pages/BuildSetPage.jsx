import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

const AVAILABLE_POSES = [
    { value: 'warrior1', label: 'Warrior I' },
    { value: 'warrior2', label: 'Warrior II' },
    { value: 'tree', label: 'Tree' },
    { value: 'triangle', label: 'Triangle' },
];

const BuildSetPage = ({ onHomeClick }) => {
    const { token } = useAuth();
    const [customSets, setCustomSets] = useState([]);
    const [loadingSets, setLoadingSets] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [setName, setSetName] = useState('');
    const [selectedPoses, setSelectedPoses] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    useEffect(() => { fetchCustomSets(); }, []);

    const fetchCustomSets = async () => {
        setLoadingSets(true); setFetchError(null);
        try {
            const res = await fetch(`${API_BASE}/api/custom-sets`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error('Failed to fetch custom sets');
            const data = await res.json();
            setCustomSets(data.custom_sets || []);
        } catch (err) { setFetchError('Could not load custom sets.'); }
        finally { setLoadingSets(false); }
    };

    const handleAddPose = (v) => { setSelectedPoses([...selectedPoses, v]); setSubmitSuccess(false); };
    const handleRemovePose = (i) => { setSelectedPoses(selectedPoses.filter((_, idx) => idx !== i)); };
    const handleClear = () => { setSelectedPoses([]); };

    const handleCreateSet = async (e) => {
        e.preventDefault(); setSubmitError(null); setSubmitSuccess(false);
        if (!setName.trim()) { setSubmitError('Please provide a name for your set.'); return; }
        if (selectedPoses.length === 0) { setSubmitError('Please add at least one pose to your set.'); return; }
        setIsSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/api/custom-sets`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ name: setName.trim(), poses: selectedPoses }) });
            if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.detail || 'Failed to create set'); }
            setSubmitSuccess(true); setSetName(''); setSelectedPoses([]); fetchCustomSets();
        } catch (err) { setSubmitError(err.message || 'An error occurred.'); }
        finally { setIsSubmitting(false); }
    };

    const handleDeleteSet = async (setId) => {
        if (!window.confirm('Are you sure you want to delete this set?')) return;
        try {
            const res = await fetch(`${API_BASE}/api/custom-sets/${setId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) throw new Error('Failed to delete set');
            fetchCustomSets();
        } catch (err) { alert('Failed to delete the set.'); }
    };

    const s = {
        layout: { flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto 1fr', columnGap: 22, rowGap: 14 },
        card: { flex: 1, minHeight: 0, background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 18, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 },
        fieldLabel: { fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--ya-muted)', fontWeight: 500 },
        fieldInput: { font: 'inherit', fontSize: 16, color: 'var(--ya-ink)', background: 'var(--ya-paper-3)', border: '1px solid var(--ya-rule)', borderRadius: 12, padding: '13px 16px', outline: 'none' },
        poseBtn: { font: 'inherit', fontSize: 13, fontWeight: 500, color: 'var(--ya-forest)', background: 'var(--ya-paper-3)', border: '1px solid var(--ya-rule)', borderRadius: 999, padding: '9px 14px 9px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, transition: 'background .15s, border-color .15s' },
        seqItem: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--ya-forest)', color: 'var(--ya-paper-2)', padding: '7px 8px 7px 11px', borderRadius: 999, fontSize: 13, fontWeight: 500 },
        saveBtn: (disabled) => ({ background: disabled ? 'var(--ya-sand)' : 'var(--ya-forest)', color: disabled ? 'var(--ya-paper-3)' : 'var(--ya-paper-2)', border: 0, borderRadius: 999, padding: '16px 22px', font: 'inherit', fontSize: 14, fontWeight: 500, letterSpacing: '0.06em', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, transition: 'background .2s, transform .15s', boxShadow: disabled ? 'none' : '0 14px 32px -18px rgba(47,55,39,0.6)', opacity: disabled ? 0.7 : 1 }),
        set: { background: 'var(--ya-paper-2)', border: '1px solid var(--ya-rule)', borderRadius: 16, padding: '16px 18px', transition: 'border-color .2s' },
        posePill: { fontSize: 11, color: 'var(--ya-forest)', background: 'rgba(110,118,87,0.13)', border: '1px solid rgba(110,118,87,0.2)', padding: '4px 10px', borderRadius: 999, display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 500 },
    };

    const canSave = setName.trim().length > 0 && selectedPoses.length > 0 && !isSubmitting;

    return (
        <div className="ya-page" style={{ overflow: 'hidden' }}>
            <div className="ya-shell-flex">
                <header style={{ display: 'flex', alignItems: 'center' }}>
                    <button className="ya-home-link" onClick={onHomeClick}>
                        <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>Home
                    </button>
                </header>

                <main style={s.layout}>
                    {/* Left header */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <h1 style={{ fontFamily: 'var(--ya-serif)', fontSize: 40, fontWeight: 400, letterSpacing: '-0.012em', lineHeight: 1.02, margin: 0 }}>Build a <em style={{ fontStyle: 'italic', color: 'var(--ya-brown-2)' }}>custom</em> set</h1>
                        <p style={{ fontSize: 13, color: 'var(--ya-ink-soft)', margin: 0 }}>Create and manage your own personalized yoga sequences.</p>
                    </div>
                    {/* Right header */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'end', gap: 8, paddingBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                            <h2 style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, fontWeight: 400, margin: 0 }}>Your <em style={{ fontStyle: 'italic', color: 'var(--ya-brown-2)' }}>saved</em> sets</h2>
                            <span style={{ fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--ya-muted)' }}>{customSets.length} saved</span>
                        </div>
                        <div style={{ height: 1, background: 'var(--ya-rule)' }} />
                    </div>

                    {/* LEFT: Create */}
                    <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <div style={s.card}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <label style={s.fieldLabel}>Set name</label>
                                <input style={s.fieldInput} type="text" placeholder="e.g. Morning wakeup flow" maxLength={40} value={setName} onChange={(e) => setSetName(e.target.value)} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <span style={s.fieldLabel}>Add poses to sequence</span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {AVAILABLE_POSES.map((p) => (
                                        <button key={p.value} type="button" style={s.poseBtn} onClick={() => handleAddPose(p.value)}>
                                            <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--ya-forest)', color: 'var(--ya-paper-2)', display: 'grid', placeItems: 'center' }}>
                                                <svg viewBox="0 0 24 24" style={{ width: 9, height: 9, stroke: 'currentColor', fill: 'none', strokeWidth: 2.6, strokeLinecap: 'round' }}><path d="M12 5v14M5 12h14"/></svg>
                                            </span>
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ flex: 1, minHeight: 140, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={s.fieldLabel}>Your sequence</span>
                                    <button onClick={handleClear} disabled={selectedPoses.length === 0} style={{ font: 'inherit', fontSize: 11, fontWeight: 500, color: 'var(--ya-muted)', background: 'transparent', border: 0, cursor: selectedPoses.length === 0 ? 'not-allowed' : 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted', opacity: selectedPoses.length === 0 ? 0.35 : 1 }}>Clear all</button>
                                </div>
                                <div style={{ flex: 1, background: 'var(--ya-paper-3)', border: '1.5px dashed var(--ya-rule)', borderRadius: 14, padding: 16, display: 'flex', flexWrap: 'wrap', gap: 8, alignContent: selectedPoses.length === 0 ? 'center' : 'flex-start', alignItems: selectedPoses.length === 0 ? 'center' : 'flex-start', justifyContent: selectedPoses.length === 0 ? 'center' : 'flex-start', minHeight: 140, overflowY: 'auto' }}>
                                    {selectedPoses.length === 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--ya-muted)', textAlign: 'center' }}>
                                            <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(110,118,87,0.10)', display: 'grid', placeItems: 'center', color: 'var(--ya-olive)' }}>
                                                <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 17l9 5 9-5"/></svg>
                                            </span>
                                            <span style={{ fontSize: 12.5, maxWidth: '26ch', lineHeight: 1.4 }}>Tap a pose above to add it to your sequence.</span>
                                        </div>
                                    ) : selectedPoses.map((pv, i) => {
                                        const label = AVAILABLE_POSES.find(p => p.value === pv)?.label || pv;
                                        return (
                                            <span key={i} style={s.seqItem}>
                                                <span style={{ fontSize: 10, letterSpacing: '0.12em', opacity: 0.7, marginRight: 4 }}>{String(i + 1).padStart(2, '0')}</span>
                                                {label}
                                                <button onClick={() => handleRemovePose(i)} aria-label="Remove" style={{ width: 18, height: 18, borderRadius: '50%', border: 0, background: 'rgba(236,226,200,0.18)', color: 'var(--ya-paper-2)', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0 }}>
                                                    <svg viewBox="0 0 24 24" style={{ width: 9, height: 9, stroke: 'currentColor', fill: 'none', strokeWidth: 2.6, strokeLinecap: 'round' }}><path d="M6 6l12 12M18 6L6 18"/></svg>
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>

                            {(submitError || submitSuccess) && (
                                <div style={{ padding: '10px 14px', borderRadius: 12, fontSize: 13, textAlign: 'center', background: submitError ? 'rgba(142,58,24,0.08)' : 'rgba(110,118,87,0.1)', color: submitError ? 'var(--ya-fix)' : 'var(--ya-olive)', border: `1px solid ${submitError ? 'rgba(142,58,24,0.2)' : 'rgba(110,118,87,0.25)'}` }}>
                                    {submitError || 'Set successfully created!'}
                                </div>
                            )}

                            <button onClick={handleCreateSet} disabled={!canSave} style={s.saveBtn(!canSave)}>
                                <span>{isSubmitting ? 'Saving…' : 'Save set'}</span>
                                {!isSubmitting && <span style={{ display: 'inline-flex', alignItems: 'center' }}><svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg></span>}
                            </button>
                        </div>
                    </section>

                    {/* RIGHT: Saved sets */}
                    <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 6px 8px 2px' }}>
                            {loadingSets ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--ya-muted)', fontSize: 14 }}>Loading...</div>
                            ) : fetchError ? (
                                <div className="ya-auth-error">{fetchError}</div>
                            ) : customSets.length === 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8, color: 'var(--ya-muted)', textAlign: 'center' }}>
                                    <p style={{ fontFamily: 'var(--ya-serif)', fontSize: 18, color: 'var(--ya-ink)' }}>No custom sets yet</p>
                                    <p style={{ fontSize: 13 }}>Use the builder to create your first custom sequence.</p>
                                </div>
                            ) : customSets.map((set) => (
                                <article key={set.set_id} style={s.set}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                                        <div>
                                            <h3 style={{ fontFamily: 'var(--ya-serif)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.005em', lineHeight: 1.05, margin: '0 0 3px', color: 'var(--ya-ink)' }}>{set.name}</h3>
                                            <p style={{ fontSize: 11, color: 'var(--ya-muted)', margin: 0 }}><b style={{ color: 'var(--ya-ink-soft)', fontWeight: 600 }}>{set.poses.length}</b> pose{set.poses.length > 1 ? 's' : ''} · Created {new Date(set.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <button onClick={() => handleDeleteSet(set.set_id)} aria-label="Delete set" style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid transparent', background: 'transparent', color: 'var(--ya-muted)', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                                            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M4 7h16"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/></svg>
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {set.poses.map((pv, i) => {
                                            const label = AVAILABLE_POSES.find(p => p.value === pv)?.label || pv;
                                            return <span key={i} style={s.posePill}><span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ya-olive)', fontWeight: 600, opacity: 0.85 }}>{i + 1}.</span>{label}</span>;
                                        })}
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default BuildSetPage;
