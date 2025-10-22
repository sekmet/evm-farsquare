import { useState } from "react";
import { CheckCircle, Edit3, Badge } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge as UIBadge } from "@/components/ui/badge";

interface Claim {
  value: string;
  verified?: boolean;
  timestamp?: string;
}

interface ClaimsProps {
  claims: Record<string, Claim>;
  onUpdate?: (claimKey: string, value: string) => void;
}

export function IdentityClaims({ claims, onUpdate }: ClaimsProps) {
  const [editingClaim, setEditingClaim] = useState<string | null>(null);

  const claimTopics = [
    { key: 'KYC', label: 'Know Your Customer', required: true },
    { key: 'AML', label: 'Anti-Money Laundering', required: true },
    { key: 'ACCREDITATION', label: 'Investor Accreditation', required: false },
    { key: 'JURISDICTION', label: 'Regulatory Jurisdiction', required: true },
  ];

  const handleUpdateClaim = (claimKey: string, value: string) => {
    if (onUpdate) {
      onUpdate(claimKey, value);
    }
    setEditingClaim(null);
  };

  return (
    <div className="space-y-4">
      {claimTopics.map((topic) => (
        <Card key={topic.key}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">{topic.label}</CardTitle>
              {topic.required && (
                <UIBadge variant="secondary" className="mt-1">
                  Required
                </UIBadge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingClaim(topic.key)}
              disabled={editingClaim === topic.key}
            >
              {claims[topic.key] ? 'Update' : 'Add'}
            </Button>
          </CardHeader>
          {claims[topic.key] && (
            <CardContent>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600">
                  Verified: {claims[topic.key].value}
                </span>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
