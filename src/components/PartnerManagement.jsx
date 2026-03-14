import React, { useState, useEffect } from 'react';
import { Users, PlusCircle, CheckCircle, Copy, Shield, Building, User, MapPin, Mail, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const PartnerManagement = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    phoneNumber: '',
    region: ''
  });

  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPartners = async () => {
    try {
      const q = query(collection(db, "logistics_users"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedPartners = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPartners(fetchedPartners);
    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Failed to load partners.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generateCredentials = async (e) => {
    e.preventDefault();
    if (!formData.companyName || !formData.contactName || !formData.contactEmail || !formData.phoneNumber || !formData.region) {
      toast.error('Please fill all fields');
      return;
    }
    
    const newUsername = formData.companyName.toLowerCase().replace(/\s/g, '') + '_driver';
    const newPassword = Math.random().toString(36).slice(-8);

    try {
      await addDoc(collection(db, "logistics_users"), {
        ...formData,
        username: newUsername,
        password: newPassword, // Note: In production this would be hashed, raw is okay for hackathon demo
        isActive: true,
        createdAt: new Date()
      });

      setFormData({ companyName: '', contactName: '', contactEmail: '', phoneNumber: '', region: '' });
      toast.success('Logistics Partner credentials generated securely.');
      fetchPartners(); // Refresh UI
    } catch (error) {
      console.error("Error adding document: ", error);
      toast.error('Failed to create partner.');
    }
  };

  const toggleStatus = async (userId, currentStatus) => {
    try {
      const userRef = doc(db, "logistics_users", userId);
      await updateDoc(userRef, {
        isActive: !currentStatus
      });
      fetchPartners(); // Refresh UI
      toast.success(`Partner ${!currentStatus ? 'activated' : 'deactivated'}.`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error('Failed to update status.');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="neon-glass-card" style={{ padding: 28, background: 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(34,211,238,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Users size={20} style={{ color: 'var(--neon-cyan)' }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--neon-text)' }}>Logistics Network Management</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--neon-text-muted)' }}>Central authority control over authorized supply chain handlers</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        {/* Form Section */}
        <div style={{ background: 'rgba(24,24,27,0.4)', borderRadius: 16, border: '1px solid var(--neon-glass-border)', padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <PlusCircle size={16} style={{ color: 'var(--neon-emerald)' }} /> Add New Partner
          </h3>
          <form onSubmit={generateCredentials} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--neon-text-muted)', marginBottom: 6 }}>Company Name</label>
              <div style={{ position: 'relative' }}>
                <Building size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--neon-text-muted)' }} />
                <input 
                  type="text" 
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  required
                  placeholder="GreenRoute Logistics Ltd."
                  style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                  onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 1px #3b82f6'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--neon-text-muted)', marginBottom: 6 }}>Primary Contact Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--neon-text-muted)' }} />
                  <input 
                    type="text" 
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleInputChange}
                    required
                    placeholder="Rajesh Sharma"
                    style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                    onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 1px #3b82f6'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--neon-text-muted)', marginBottom: 6 }}>Contact Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--neon-text-muted)' }} />
                  <input 
                    type="email" 
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    required
                    placeholder="dispatch@greenroute.in"
                    style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                    onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 1px #3b82f6'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--neon-text-muted)', marginBottom: 6 }}>Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--neon-text-muted)' }} />
                  <input 
                    type="tel" 
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    required
                    placeholder="+91 98765 43210"
                    style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                    onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 1px #3b82f6'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--neon-text-muted)', marginBottom: 6 }}>Operating Region</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--neon-text-muted)' }} />
                  <input 
                    type="text" 
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    required
                    placeholder="Maharashtra - West Zone"
                    style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                    onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 1px #3b82f6'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>
            </div>


            <button 
              type="submit"
              style={{ padding: '14px', background: 'linear-gradient(135deg, var(--neon-cyan), #0284c7)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 20px -10px rgba(2,132,199,0.5)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <Shield size={18} /> Generate Partner Credentials
            </button>
          </form>
        </div>

        {/* Table Section */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={16} style={{ color: 'var(--neon-cyan)' }} /> Active Logistics Accounts
          </h3>
          <div style={{ background: 'rgba(24,24,27,0.4)', borderRadius: 16, border: '1px solid var(--neon-glass-border)', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ overflowX: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, color: 'var(--neon-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Partner</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, color: 'var(--neon-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Region & Contact</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, color: 'var(--neon-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Credentials</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, color: 'var(--neon-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--neon-text-muted)' }}>Loading partners...</td>
                    </tr>
                  ) : partners.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--neon-text-muted)' }}>No logistics partners found</td>
                    </tr>
                  ) : partners.map((p) => (
                    <tr key={p.id} style={{ borderTop: '1px solid var(--neon-glass-border)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--neon-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                           {p.companyName}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--neon-text-muted)', marginTop: 2 }}>{p.contactName}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                         <div style={{ fontSize: 13, color: 'var(--neon-text-muted)' }}>{p.region}</div>
                         <div style={{ fontSize: 11, color: 'var(--neon-text-muted)', opacity: 0.7, marginTop: 2 }}>{p.contactEmail}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: 'var(--neon-text-muted)', width: 32 }}>User:</span>
                          <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--neon-cyan)', background: 'rgba(34,211,238,0.1)', padding: '2px 6px', borderRadius: 4 }}>{p.username}</span>
                          <button type="button" onClick={() => copyToClipboard(p.username)} style={{ background: 'none', border: 'none', color: 'var(--neon-text-muted)', cursor: 'pointer', padding: 2 }}><Copy size={12} /></button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--neon-text-muted)', width: 32 }}>Pass:</span>
                          <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--neon-pink)', background: 'rgba(236,72,153,0.1)', padding: '2px 6px', borderRadius: 4 }}>{p.password}</span>
                          <button type="button" onClick={() => copyToClipboard(p.password)} style={{ background: 'none', border: 'none', color: 'var(--neon-text-muted)', cursor: 'pointer', padding: 2 }}><Copy size={12} /></button>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button 
                          onClick={() => toggleStatus(p.id, p.isActive)}
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: 4, 
                            background: p.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(236,72,153,0.1)', 
                            color: p.isActive ? 'var(--neon-emerald)' : 'var(--neon-pink)', 
                            border: `1px solid ${p.isActive ? 'rgba(16,185,129,0.3)' : 'rgba(236,72,153,0.3)'}`,
                            padding: '4px 10px', 
                            borderRadius: 12, 
                            fontSize: 11, 
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.2)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)' }}
                        >
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', boxShadow: `0 0 6px currentColor` }} /> 
                          {p.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerManagement;
