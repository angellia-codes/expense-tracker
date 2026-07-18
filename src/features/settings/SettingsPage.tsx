import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Download, LogOut, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useAuth } from '@/features/auth/useAuth'
import { authService } from '@/features/auth/authService'
import { useExportBackup, useImportTransactions, useUpdateProfile } from './useSettings'
import { profileSchema, type ProfileFormData } from '@/utils/validation'
import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/date'
import type { DateFormat } from '@/types'

const CURRENCIES = ['IDR', 'USD', 'EUR', 'GBP', 'JPY', 'SGD', 'MYR', 'PHP']
const DATE_FORMATS: DateFormat[] = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']
const THEMES = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
] as const

const selectClass =
  'flex h-10 w-full rounded-md border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors'

export function SettingsPage() {
  const { profile, user } = useAuth()
  const updateProfile = useUpdateProfile()
  const exportBackup = useExportBackup()
  const importTransactions = useImportTransactions()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])

  const { register, handleSubmit, watch, formState: { errors, isDirty } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      full_name: profile?.full_name ?? '',
      default_currency: profile?.default_currency ?? 'IDR',
      date_format: profile?.date_format ?? 'DD/MM/YYYY',
      theme: (profile?.theme as ProfileFormData['theme']) ?? 'dark',
    },
  })

  // Live preview so the format choices aren't abstract.
  const previewCurrency = watch('default_currency')
  const previewDateFormat = watch('date_format') as DateFormat

  const onSubmit = (data: ProfileFormData) => updateProfile.mutate(data)

  const onFilePicked = async (file: File | undefined) => {
    if (!file) return
    setImportErrors([])
    const text = await file.text()
    importTransactions.mutate(text, {
      onSuccess: result => setImportErrors(result.errors),
    })
    // Allow re-picking the same file after fixing it.
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const signOut = async () => {
    try {
      await authService.logout()
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out')
    }
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Preferences, data import and backups.</p>
      </div>

      {/* Profile & preferences */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Profile & Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="full_name">Name</Label>
              <Input id="full_name" {...register('full_name')} error={errors.full_name?.message} />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ''} disabled readOnly />
              <p className="text-xs text-text-tertiary">Changing your email isn't supported yet.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default_currency">Currency</Label>
                <select id="default_currency" className={selectClass} {...register('default_currency')}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <p className="text-xs text-text-tertiary">
                  Preview: {formatCurrency(1234567, previewCurrency)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_format">Date format</Label>
                <select id="date_format" className={selectClass} {...register('date_format')}>
                  {DATE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <p className="text-xs text-text-tertiary">
                  Preview: {formatDate(new Date(), previewDateFormat)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <select id="theme" className={selectClass} {...register('theme')}>
                {THEMES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <Button type="submit" isLoading={updateProfile.isPending} disabled={!isDirty}>
              Save changes
            </Button>
          </CardContent>
        </Card>
      </form>

      {/* Import */}
      <Card>
        <CardHeader>
          <CardTitle>Import Transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-secondary">
            Upload a CSV with the columns <code className="text-text-primary">Date, Type, Merchant, Category, Account, Amount, Notes</code> —
            the same file the export produces. Dates must be <code className="text-text-primary">YYYY-MM-DD</code>.
            Accounts and categories are matched by name and must already exist.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={e => onFilePicked(e.target.files?.[0])}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            isLoading={importTransactions.isPending}
          >
            <Upload className="w-4 h-4 mr-2" />
            Choose CSV file
          </Button>

          {importErrors.length > 0 && (
            <div className="rounded-lg border border-warning/40 bg-warning-light p-4">
              <p className="text-sm font-medium text-text-primary mb-2">
                {importErrors.length} row{importErrors.length === 1 ? '' : 's'} skipped
              </p>
              <ul className="text-xs text-text-secondary space-y-1 max-h-40 overflow-y-auto">
                {importErrors.map(error => <li key={error}>{error}</li>)}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Backup */}
      <Card>
        <CardHeader>
          <CardTitle>Backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-text-secondary">
            Download every record you own as a single JSON file. Restoring it is manual for now —
            keep it somewhere safe.
          </p>
          <Button variant="outline" onClick={() => exportBackup.mutate()} isLoading={exportBackup.isPending}>
            <Download className="w-4 h-4 mr-2" />
            Download backup
          </Button>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-danger/30">
        <CardHeader>
          <CardTitle className="text-danger">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign out
          </Button>
          <p className="text-sm text-text-secondary">
            Deleting your account permanently removes all data. Supabase requires a server-side key
            to delete a user, so this has to be done from the Supabase dashboard for now.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
