'use client';
import { useState } from 'react';
import { Icon } from './icon';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { NativeSelect } from './ui/native-select';
import { Switch } from './ui/switch';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
const FAMILIES = ['purple', 'gray', 'blue', 'red', 'orange', 'yellow', 'green'];
const LEVELS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
const SPACES = [0, 4, 6, 8, 12, 16, 20, 24, 28, 32, 48, 56, 64, 120];
const RADII = [0, 4, 8, 12, 16, 20, 32, 999];
export function DesignSystem() {
  const [email, setEmail] = useState(''),
    [checked, setChecked] = useState(true);
  return (
    <div className="content design-system-page">
      <div className="ds-intro">
        <p className="ds-eyebrow">GradRight Counselor</p>
        <h2>One system. Every screen.</h2>
        <p>Inter, the approved Figma palette, and shared spacing, radius and stroke tokens.</p>
      </div>
      <Tabs defaultValue="components">
        <TabsList aria-label="Design system sections">
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
        </TabsList>
        <TabsContent value="components">
          <div className="ds-grid">
            <Card className="ds-specimen">
              <h3>Buttons</h3>
              <p>Consistent sizes, focus, disabled and intent states.</p>
              <div className="ds-row">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
              <div className="ds-row">
                <Button size="sm">Small</Button>
                <Button disabled>Disabled</Button>
                <Button size="icon" aria-label="Add item">
                  <Icon name="add" />
                </Button>
              </div>
            </Card>
            <Card className="ds-specimen">
              <h3>Forms</h3>
              <div className="field">
                <Label htmlFor="ds-email">Email address</Label>
                <Input
                  id="ds-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-describedby="ds-email-help"
                />
                <small id="ds-email-help" className="hint-text">
                  Labels remain visible while you type.
                </small>
              </div>
              <div className="field">
                <Label htmlFor="ds-disabled">Verified mobile</Label>
                <Input id="ds-disabled" value="+91 98765 43210" disabled readOnly />
              </div>
              <div className="field">
                <Label htmlFor="ds-error">Error state</Label>
                <Input
                  id="ds-error"
                  defaultValue="Invalid address"
                  aria-invalid="true"
                  aria-describedby="ds-error-message"
                />
                <small id="ds-error-message" className="ds-error-message">
                  Enter a valid email address.
                </small>
              </div>
              <div className="field">
                <Label htmlFor="ds-country">Country</Label>
                <NativeSelect id="ds-country">
                  <option>USA</option>
                  <option>UK</option>
                  <option>Canada</option>
                </NativeSelect>
              </div>
              <div className="field">
                <Label htmlFor="ds-bio">Bio</Label>
                <Textarea id="ds-bio" placeholder="Your counseling experience" />
              </div>
            </Card>
            <Card className="ds-specimen">
              <h3>Dialog and switch</h3>
              <div className="ds-row">
                <Switch id="ds-notifications" checked={checked} onCheckedChange={setChecked} />
                <Label htmlFor="ds-notifications">Booking notifications</Label>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogTitle>Shared dialog</DialogTitle>
                  <DialogDescription>
                    Keyboard focus stays inside this dialog. Escape closes it and returns focus to
                    the trigger.
                  </DialogDescription>
                  <DialogClose asChild>
                    <Button>Done</Button>
                  </DialogClose>
                </DialogContent>
              </Dialog>
            </Card>
            <Card className="ds-specimen">
              <h3>Typography</h3>
              <div className="ds-type-display">Inter</div>
              <h2>Counseling, made clear.</h2>
              <p>One typeface across headings, body text, controls and labels.</p>
              <small className="hint-text">Variable weights: 400–700.</small>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="colors">
          <div className="ds-colors">
            {FAMILIES.map((family) => (
              <Card key={family} className="ds-specimen">
                <h3>{family}</h3>
                <div className="ds-swatches">
                  {LEVELS.map((level) => (
                    <div key={level}>
                      <span
                        className="ds-swatch"
                        style={{ background: `var(--${family}-${level})` }}
                      />
                      <small>
                        {family}/{level}
                      </small>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="layout">
          <div className="ds-grid">
            <Card className="ds-specimen">
              <h3>Spacing</h3>
              {SPACES.map((value, i) => (
                <div className="ds-token-row" key={i}>
                  <code>space-{i}</code>
                  <span>{value}px</span>
                  <span className="ds-space-bar" style={{ width: `var(--space-${i})` }} />
                </div>
              ))}
            </Card>
            <Card className="ds-specimen">
              <h3>Radius</h3>
              <div className="ds-row">
                {RADII.map((value, i) => (
                  <div
                    key={i}
                    className="ds-radius-example"
                    style={{ borderRadius: `var(--radius-${i})` }}
                  >
                    {value}
                  </div>
                ))}
              </div>
              <h3>Stroke</h3>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="ds-token-row">
                  <code>stroke-{i}</code>
                  <span>{i}px</span>
                  <span
                    className="ds-stroke-example"
                    style={{ borderTopWidth: `var(--stroke-${i})` }}
                  />
                </div>
              ))}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
