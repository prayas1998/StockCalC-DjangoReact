import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { User, Lock, Trash2, Eye, EyeOff } from 'lucide-react';
import { profileApi, type ProfileData } from '@/services/profileApi';
import Header from '@/components/ui/header';

interface ValidationErrors {
  [key: string]: string[];
}

const ProfileLoading = () => (
  <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
      <p className="mt-4 text-muted-foreground">Loading profile...</p>
    </div>
  </div>
);

const ProfileSettings = ({ userId }: { userId: string }) => {
  const { clearRevokedSession } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const mounted = useRef(false);

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [activeSessions, setActiveSessions] = useState<number | null>(null);
  const [revokingSessions, setRevokingSessions] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [deleteForm, setDeleteForm] = useState({
    password: ''
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    mounted.current = true;
    let active = true;
    setLoading(true);
    setProfileData(null);
    setActiveSessions(null);
    setErrors({});

    const loadProfile = async () => {
      try {
        const data = await profileApi.getProfile();
        if (active) setProfileData(data);
      } catch (error: unknown) {
        if (!active) return;
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'Please log in again to access your profile'
          });
          navigate('/');
        } else if (status === 403) {
          toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'You do not have permission to access this profile'
          });
        } else if (status && status >= 500) {
          toast({
            variant: 'destructive',
            title: 'Server Error',
            description: 'Our servers are experiencing issues. Please try again later.'
          });
        } else {
          const message = (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.message ||
            (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            'Failed to load profile information';
          toast({
            variant: 'destructive',
            title: 'Error',
            description: message
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadProfile();
    void profileApi.getSecurityStatus().then((data) => {
      if (active) setActiveSessions(data.active_sessions);
    }).catch(() => {
      if (active) setActiveSessions(null);
    });

    return () => {
      mounted.current = false;
      active = false;
    };
  }, [userId, navigate, toast]);

  const handleRevokeSessions = async () => {
    setRevokingSessions(true);
    try {
      const { data: { message }, caller } = await profileApi.revokeAllSessions(userId);
      if (await clearRevokedSession(caller)) {
        toast({ title: 'Sessions signed out', description: message });
      }
    } catch (error: unknown) {
      if (mounted.current) {
        toast({
          variant: 'destructive',
          title: 'Unable to sign out all sessions',
          description: error instanceof Error ? error.message : 'Please try again.'
        });
      }
    } finally {
      setRevokingSessions(false);
    }
  };

  const validatePasswordForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!passwordForm.current_password) {
      newErrors.current_password = ['Current password is required'];
    }

    if (!passwordForm.new_password) {
      newErrors.new_password = ['New password is required'];
    } else if (passwordForm.new_password.length < 8) {
      newErrors.new_password = ['Password must be at least 8 characters long'];
    }

    if (!passwordForm.confirm_password) {
      newErrors.confirm_password = ['Please confirm your new password'];
    } else if (passwordForm.new_password !== passwordForm.confirm_password) {
      newErrors.confirm_password = ['Passwords do not match'];
    }

    if (
      passwordForm.current_password &&
      passwordForm.new_password &&
      passwordForm.current_password === passwordForm.new_password
    ) {
      newErrors.new_password = ['New password must be different from current password'];
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validatePasswordForm()) {
      return;
    }

    setUpdating(true);

    try {
      const { data: response, caller } = await profileApi.changePassword(userId, passwordForm);
      if (await clearRevokedSession(caller)) {
        toast({
          variant: response.temporary_session_revoked ? 'default' : 'destructive',
          title: 'Password changed',
          description: response.message
        });
      }
      resetPasswordForm();
    } catch (error: unknown) {
      if (mounted.current) {
        toast({
          variant: 'destructive',
          title: 'Unable to change password',
          description: error instanceof Error ? error.message : 'Please try again.'
        });
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    setErrors({});
    setDeleting(true);

    try {
      const { data: response, caller } = await profileApi.deleteAccount(userId, deleteForm.password);
      if (!response.success) throw new Error(response.message);
      setShowDeleteDialog(false);
      if (await clearRevokedSession(caller)) {
        toast({ title: 'Account deleted', description: response.message });
      }
    } catch (error: unknown) {
      if (mounted.current) {
        toast({
          variant: 'destructive',
          title: 'Unable to delete account',
          description: error instanceof Error ? error.message : 'Please try again.'
        });
      }
    } finally {
      setDeleting(false);
      setDeleteForm({ password: '' });
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const resetPasswordForm = () => {
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
    setErrors({});
  };

  const handlePasswordFormChange = (field: keyof typeof passwordForm, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  if (loading) return <ProfileLoading />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground">Manage your account and security settings</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  {profileData?.username && <CardDescription>Your username is permanent.</CardDescription>}
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="identifier">{profileData?.username ? 'Username' : 'Sign-in email'}</Label>
                      <Input id="identifier" value={profileData?.username || profileData?.email || ''} readOnly />
                    </div>

                    {profileData && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
                          <p className="text-sm text-foreground">
                            {profileData.date_joined
                              ? new Date(profileData.date_joined).toLocaleDateString()
                              : 'Not available'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Last Login</Label>
                          <p className="text-sm text-foreground">
                            {profileData.last_login
                              ? new Date(profileData.last_login).toLocaleDateString()
                              : 'Never'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your password to keep your account secure</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="current_password">Current Password</Label>
                      <div className="relative">
                        <Input
                          id="current_password"
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordForm.current_password}
                          onChange={(e) => handlePasswordFormChange('current_password', e.target.value)}
                          placeholder="Enter your current password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('current')}
                        >
                          {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {errors.current_password && (
                        <p className="text-sm text-destructive">{errors.current_password[0]}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new_password">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new_password"
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordForm.new_password}
                          onChange={(e) => handlePasswordFormChange('new_password', e.target.value)}
                          placeholder="Enter your new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('new')}
                        >
                          {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {errors.new_password && (
                        <div className="space-y-1">
                          {errors.new_password.map((error, index) => (
                            <p key={index} className="text-sm text-destructive">{error}</p>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm_password"
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordForm.confirm_password}
                          onChange={(e) => handlePasswordFormChange('confirm_password', e.target.value)}
                          placeholder="Confirm your new password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => togglePasswordVisibility('confirm')}
                        >
                          {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {errors.confirm_password && (
                        <p className="text-sm text-destructive">{errors.confirm_password[0]}</p>
                      )}
                    </div>

                    {errors.non_field_errors && (
                      <div className="space-y-1">
                        {errors.non_field_errors.map((error, index) => (
                          <p key={index} className="text-sm text-destructive">{error}</p>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <Button type="submit" disabled={updating} className="flex-1 md:flex-none">
                        {updating ? 'Changing Password...' : 'Change Password'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetPasswordForm}
                        disabled={updating}
                        className="flex-1 md:flex-none"
                      >
                        Clear
                      </Button>
                    </div>
                  </form>

                  <Separator className="my-8" />

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Sessions</h3>
                    <p className="text-sm text-muted-foreground">
                      Active sessions: {activeSessions ?? 'Unknown'}
                    </p>
                    <Button variant="outline" onClick={handleRevokeSessions} disabled={revokingSessions}>
                      {revokingSessions ? 'Signing out...' : 'Sign out on all devices'}
                    </Button>
                  </div>

                  <Separator className="my-8" />

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Danger Zone</h3>
                    <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg">
                      <h4 className="font-medium text-red-800 dark:text-red-300 mb-2">Delete Account</h4>
                      <p className="text-sm text-red-700 dark:text-red-400 mb-4">
                        This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                      </p>
                      <Button
                        variant="destructive"
                        onClick={() => setShowDeleteDialog(true)}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        if (deleting) return;
        setShowDeleteDialog(open);
        if (!open) setDeleteForm({ password: '' });
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete_password">Confirm your password</Label>
              <Input
                id="delete_password"
                type="password"
                value={deleteForm.password}
                onChange={(e) => setDeleteForm({ password: e.target.value })}
                placeholder="Enter your password to confirm"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password[0]}</p>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => { event.preventDefault(); void handleDeleteAccount(); }}
              disabled={deleting || !deleteForm.password}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate('/', { replace: true });
  }, [loading, user, navigate]);

  if (loading) return <ProfileLoading />;
  return user ? <ProfileSettings key={user.id} userId={user.id} /> : null;
};

export default Profile;
