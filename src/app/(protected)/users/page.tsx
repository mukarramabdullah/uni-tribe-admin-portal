'use client';

import React, { useState, useEffect } from 'react';
import { Shield, ShieldOff, User, Upload } from 'lucide-react';
import { User as UserType } from '../../../types';
import Table from '../../../components/UI/Table';
import LoadingSpinner from '../../../components/UI/LoadingSpinner';
import Modal from '../../../components/UI/Modal';
import toast from 'react-hot-toast';
import {
  fileToBase64,
  validateFileType,
  validateFileSize,
  formatFileSize,
} from '../../../utils/base64Utils';
import {
  updateUserProfilePicture,
  getDocuments,
  updateDocument,
} from '../../../utils/firestore';
import { logUpdate } from '../../../utils/auditLogger';
import { useAuth } from '../../../context/AuthContext';

const Users: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const firestoreUsers = await getDocuments('users');
      setUsers(firestoreUsers.map((user: any) => ({
        _id: user.id || user._id || '',
        email: user.email || '',
        displayName: user.displayName || user.name || 'Unknown',
        photoURL: user.photoURL || user.photo || undefined,
        isBlocked: user.isBlocked || false,
        createdAt: user.createdAt?.toDate?.()?.toISOString() || user.createdAt || new Date().toISOString(),
        lastLoginAt: user.lastLoginAt?.toDate?.()?.toISOString() || user.lastLoginAt || undefined,
      })));
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async (userId: string, isBlocked: boolean) => {
    try {
      // Update user block status in Firestore
      await updateDocument('users', userId, { isBlocked: !isBlocked });
      
      // Update local state
      setUsers(users.map(user => 
        user._id === userId ? { ...user, isBlocked: !isBlocked } : user
      ));
      
      // Log the block/unblock action
      if (currentUser) {
        await logUpdate(
          { uid: currentUser.uid, email: currentUser.email || 'unknown' },
          'USERS',
          userId,
          { action: !isBlocked ? 'blocked_user' : 'unblocked_user' }
        );
      }
      
      toast.success(`User ${!isBlocked ? 'blocked' : 'unblocked'} successfully`);
    } catch (error) {
      console.error('Failed to toggle user block status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleUploadPhoto = (user: UserType) => {
    setSelectedUser(user);
    setSelectedFile(null);
    setPreviewUrl('');
    setIsPhotoModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const typeValidation = validateFileType(file, allowedTypes);
      
      if (!typeValidation.valid) {
        toast.error(typeValidation.error || 'Invalid file type');
        e.target.value = '';
        return;
      }

      const maxSize = 5; // 5MB
      const sizeValidation = validateFileSize(file, maxSize);
      if (!sizeValidation.valid) {
        toast.error(sizeValidation.error || 'File too large');
        e.target.value = '';
        return;
      }

      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      toast.success(`Image selected (${formatFileSize(file.size)})`);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !selectedUser) {
      toast.error('Please select an image');
      return;
    }

    setUploading(true);
    try {
      const photoData = await fileToBase64(selectedFile);
      const userId = selectedUser._id || '';
      await updateUserProfilePicture(userId, photoData.data);
      
      // Log profile picture update
      if (currentUser) {
        await logUpdate(currentUser, 'users', userId, {
          action: 'Profile picture updated',
          targetUser: selectedUser.email || selectedUser.displayName,
          fileName: selectedFile.name,
          fileSize: selectedFile.size
        });
      }
      
      toast.success('Profile picture updated successfully');
      setIsPhotoModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl('');
      fetchUsers();
    } catch (error) {
      console.error('Failed to upload photo:', error);
      toast.error('Failed to upload photo: ' + (error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const columns = [
    {
      key: 'displayName',
      header: 'Name',
      render: (user: UserType) => (
        <div className="flex items-center space-x-3">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
          )}
          <span>{user.displayName || 'No name'}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
    },
    {
      key: 'isBlocked',
      header: 'Status',
      render: (user: UserType) => (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
          user.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
        }`}>
          {user.isBlocked ? 'Blocked' : 'Active'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (user: UserType) => new Date(user.createdAt).toLocaleDateString(),
      sortable: true,
    },
    {
      key: 'lastLoginAt',
      header: 'Last Login',
      render: (user: UserType) => 
        user.lastLoginAt 
          ? new Date(user.lastLoginAt).toLocaleDateString()
          : 'Never',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user: UserType) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleUploadPhoto(user)}
            className="flex items-center space-x-1 px-3 py-1 rounded text-sm font-medium transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200"
            title="Upload Photo"
          >
            <Upload className="h-4 w-4" />
            <span>Photo</span>
          </button>
          <button
            onClick={() => handleToggleBlock(user._id, user.isBlocked)}
            className={`flex items-center space-x-1 px-3 py-1 rounded text-sm font-medium transition-colors ${
              user.isBlocked 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            {user.isBlocked ? (
              <>
                <Shield className="h-4 w-4" />
                <span>Unblock</span>
              </>
            ) : (
              <>
                <ShieldOff className="h-4 w-4" />
                <span>Block</span>
              </>
            )}
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <div className="text-sm text-gray-600">
          Total Users: {users.length}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table data={users} columns={columns} />
      </div>

      <Modal
        isOpen={isPhotoModalOpen}
        onClose={() => {
          setIsPhotoModalOpen(false);
          setSelectedFile(null);
          setPreviewUrl('');
        }}
        title="Upload Profile Picture"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Upload a profile picture for <strong>{selectedUser?.displayName || selectedUser?.email}</strong>
            </p>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Max size: 5MB. Supported: JPG, PNG, WEBP
            </p>
          </div>

          {selectedFile && previewUrl && (
            <div className="flex flex-col items-center">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="h-40 w-40 object-cover rounded-full border-4 border-blue-100"
              />
              <p className="text-xs text-green-600 mt-2">
                {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsPhotoModalOpen(false);
                setSelectedFile(null);
                setPreviewUrl('');
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUploadSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={uploading || !selectedFile}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Photo
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Users;