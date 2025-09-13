#!/usr/bin/env node

/**
 * Populate Nexus Analytics with Sample Data
 * Creates realistic analytics data for the Nexus AI dashboard card
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function populateNexusAnalytics() {
  console.log('🚀 Populating Nexus Analytics Data\n');
  console.log('='.repeat(60));

  try {
    // Get tenant and projects
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id')
      .limit(1);

    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .limit(5);

    if (!tenants || tenants.length === 0) {
      console.error('❌ No tenants found');
      return;
    }

    const tenant = tenants[0];
    console.log(`📊 Generating analytics for tenant: ${tenant.id}\n`);

    let successCount = 0;

    // Create analytics data for each project
    const projectsToProcess = projects || [{ id: 'default-project', name: 'Default Project' }];

    for (const project of projectsToProcess) {
      // Generate multiple data points for each project (simulating time series)
      for (let i = 0; i < 7; i++) {
        const daysAgo = i;
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() - daysAgo);

        // Generate realistic productivity scores that vary over time
        const productivityScore = Math.max(65, Math.min(95, 78 + Math.sin(i * 0.5) * 12 + (Math.random() - 0.5) * 10));
        const scheduleAccuracy = Math.max(70, Math.min(98, 82 + Math.cos(i * 0.3) * 8 + (Math.random() - 0.5) * 8));
        const conflictsDetected = Math.floor(Math.random() * 5); // 0-4 conflicts
        const mlConfidence = Math.max(80, Math.min(96, 88 + Math.sin(i * 0.7) * 5 + (Math.random() - 0.5) * 6));
        const resourceUtilization = Math.max(60, Math.min(90, 73 + Math.cos(i * 0.4) * 10 + (Math.random() - 0.5) * 8));

        const analyticsRecord = {
          tenant_id: tenant.id,
          project_id: project.id,
          productivity_score: Math.round(productivityScore),
          schedule_accuracy: Math.round(scheduleAccuracy),
          conflicts_detected: conflictsDetected,
          ml_confidence: Math.round(mlConfidence),
          resource_utilization: Math.round(resourceUtilization),
          performance_trend: productivityScore > 80 ? 'up' : productivityScore < 70 ? 'down' : 'stable',
          created_at: baseDate.toISOString(),
          updated_at: baseDate.toISOString()
        };

        const { error } = await supabase
          .from('nexus_analytics')
          .insert(analyticsRecord);

        if (!error) {
          successCount++;
        } else {
          console.log(`   ❌ ${project.name} (${daysAgo} days ago) - ${error.message}`);
        }
      }

      console.log(`   ✅ ${project.name} - 7 data points generated`);
    }

    // Generate some weather risks
    console.log('\n🌤️ Creating Weather Risks...');
    for (let i = 0; i < 3; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i + 1);

      const riskLevels = ['low', 'medium', 'high'];
      const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
      const tasksAffected = riskLevel === 'high' ? Math.floor(Math.random() * 8) + 3 : 
                           riskLevel === 'medium' ? Math.floor(Math.random() * 5) + 1 : 
                           Math.floor(Math.random() * 3);

      const weatherConditions = [
        'Heavy rain expected',
        'High winds forecasted',
        'Temperature drop below freezing',
        'Thunderstorms likely',
        'Snow accumulation possible'
      ];

      const weatherRecord = {
        tenant_id: tenant.id,
        project_id: projectsToProcess[0].id,
        date: futureDate.toISOString().split('T')[0],
        risk_level: riskLevel,
        impact_description: weatherConditions[Math.floor(Math.random() * weatherConditions.length)],
        tasks_affected: tasksAffected,
        weather_condition: riskLevel === 'high' ? 'severe' : riskLevel === 'medium' ? 'moderate' : 'light',
        temperature_range: riskLevel === 'high' ? '32-45°F' : '45-65°F',
        precipitation_chance: riskLevel === 'high' ? 85 : riskLevel === 'medium' ? 60 : 30,
        wind_speed: riskLevel === 'high' ? 25 : riskLevel === 'medium' ? 15 : 8
      };

      const { error: weatherError } = await supabase
        .from('weather_risks')
        .insert(weatherRecord);

      if (!weatherError) {
        console.log(`   ✅ Weather risk: ${riskLevel} - ${tasksAffected} tasks affected`);
      }
    }

    // Generate productivity metrics
    console.log('\n📈 Creating Productivity Metrics...');
    
    // Get a sample user
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (users && users.length > 0) {
      const userId = users[0].id;
      
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        const productivityRecord = {
          tenant_id: tenant.id,
          user_id: userId,
          project_id: projectsToProcess[0].id,
          date: date.toISOString().split('T')[0],
          tasks_completed: Math.floor(Math.random() * 8) + 2,
          hours_worked: 6 + Math.random() * 4,
          productivity_score: Math.floor(Math.random() * 30) + 70,
          avg_task_duration: 2 + Math.random() * 3,
          quality_rating: 3 + Math.random() * 2
        };

        await supabase
          .from('productivity_metrics')
          .insert(productivityRecord);
      }
      
      console.log('   ✅ 7 days of productivity metrics generated');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 NEXUS ANALYTICS POPULATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Generated ${successCount} analytics records`);
    console.log('✅ Created weather risk data');
    console.log('✅ Created productivity metrics');
    console.log('\n🎉 Nexus AI dashboard should now show data!');

  } catch (error) {
    console.error('\n❌ Error populating Nexus Analytics:', error);
    console.error('Details:', error.message);
  }
}

// Run the script
populateNexusAnalytics()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });