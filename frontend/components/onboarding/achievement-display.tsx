import { Shield, CheckCircle, Award, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
}

interface AchievementProps {
  achievements: Achievement[];
}

const iconMap = {
  Shield,
  CheckCircle,
  Award,
  FileText,
};

export function AchievementDisplay({ achievements }: AchievementProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {achievements.map((achievement, index) => {
        const IconComponent = iconMap[achievement.icon as keyof typeof iconMap] || CheckCircle;

        return (
          <div
            key={achievement.id}
            className="text-center relative animate-in fade-in slide-in-from-bottom-4"
            style={{ animationDelay: `${index * 200}ms` }}
          >
            <div className="relative">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
                <IconComponent className="w-8 h-8 text-white" />
              </div>
              {achievement.earned && !achievement.earnedDate && (
                <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs">
                  NEW
                </Badge>
              )}
            </div>
            <h3 className="mt-2 text-sm font-semibold">{achievement.title}</h3>
            <p className="text-xs text-gray-600">{achievement.description}</p>
            {achievement.earnedDate && (
              <p className="text-xs text-green-600 mt-1">
                Earned {new Date(achievement.earnedDate).toLocaleDateString()}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
