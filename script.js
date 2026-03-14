// REPLACE WITH YOUR ACTUAL KEYS FROM SUPABASE SETTINGS
require('dotenv').config(); // Loads variables from .env file into process.env

const SUPABASE_URL = process.env.SUPABAE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const medForm = document.getElementById('medForm');
const statusMsg = document.getElementById('statusMsg');

medForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Disable button to prevent double submit
    const btn = document.getElementById('submitBtn');
    btn.disabled = true;
    btn.innerText = "Saving...";

    const attendant_phone = document.getElementById('attendant_phone').value;
    const patient_phone = document.getElementById('patient_phone').value;
    const patient_name = document.getElementById('patient_name').value;
    const med_name = document.getElementById('med_name').value;
    const dosage = document.getElementById('dosage').value;
    const reminder_time = document.getElementById('reminder_time').value;
    
    // 1. Auto-detect timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    try {
        // 2. Check if profile already exists for this patient phone
        let { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('patient_phone', patient_phone)
            .single();

        let profileId;

        if (!profile) {
            // 3. Create new profile if not found
            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert([{ attendant_phone, patient_phone, patient_name, timezone }])
                .select()
                .single();
            
            if (createError) throw createError;
            profileId = newProfile.id;
        } else {
            profileId = profile.id;
        }

        // 4. Add the medication linked to that profile ID
        const { error: medError } = await supabase
            .from('medications')
            .insert([{ 
                profile_id: profileId, 
                med_name, 
                dosage, 
                reminder_time 
            }]);

        if (medError) throw medError;

        // Success!
        statusMsg.innerText = "✅ Medication saved successfully!";
        statusMsg.className = "mt-4 text-center text-sm text-green-600 font-bold";
        medForm.reset();

    } catch (err) {
        console.error(err);
        statusMsg.innerText = "❌ Error: " + err.message;
        statusMsg.className = "mt-4 text-center text-sm text-red-600 font-bold";
    } finally {
        statusMsg.classList.remove('hidden');
        btn.disabled = false;
        btn.innerText = "Save Medication";
    }
});