// script.js
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// 2. EXPOSE FUNCTIONS TO HTML
// Since script is a module, we must manually attach functions to the 'window' object
window.updateMinEndDate = function(input) {
    const endDateInput = input.closest('.medicine-entry').querySelector('.end-date');
    endDateInput.min = input.value;
    if (endDateInput.value && endDateInput.value < input.value) {
        endDateInput.value = input.value;
    }
};

window.addMedicine = function() {
    const list = document.getElementById('medicineList');
    const firstEntry = document.querySelector('.medicine-entry');
    const newEntry = firstEntry.cloneNode(true);
    newEntry.querySelectorAll('input').forEach(i => i.value = '');
    const timeList = newEntry.querySelector('.time-list');
    timeList.innerHTML = `<div class="time-row"><input type="time" class="reminder-time" required></div>`;
    list.appendChild(newEntry);
};

window.removeMedicine = function(btn) {
    if (document.querySelectorAll('.medicine-entry').length > 1) {
        btn.closest('.medicine-entry').remove();
    } else {
        alert("At least one medicine is required.");
    }
};

window.addTime = function(btn) {
    const container = btn.previousElementSibling;
    const timeRow = document.createElement('div');
    timeRow.className = 'time-row';
    timeRow.innerHTML = `<input type="time" class="reminder-time" required>
                         <button type="button" class="del-time" onclick="this.parentElement.remove()">×</button>`;
    container.appendChild(timeRow);
};

// 3. FORM SUBMISSION LOGIC
const medicationForm = document.getElementById('medicationForm');

if (medicationForm) {
    medicationForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log("Submit event captured!"); // Debugging line

        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerText = "Processing...";

        // Collect Profile Data
        const patientData = {
            attendant_phone: document.getElementById('attendant_phone').value,
            patient_name: document.getElementById('patient_name').value,
            patient_phone: document.getElementById('patient_phone').value,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        try {
            // Step 1: Handle Profile
            let { data: profile, error: pError } = await _supabase
                .from('profiles')
                .select('id')
                .eq('patient_phone', patientData.patient_phone)
                .maybeSingle();

            if (!profile) {
                const { data: newProfile, error: insError } = await _supabase
                    .from('profiles')
                    .insert([patientData])
                    .select()
                    .single();
                if (insError) throw insError;
                profile = newProfile;
            }

            // Step 2: Handle Medicines
            const medEntries = document.querySelectorAll('.medicine-entry');
            for (const entry of medEntries) {
                const medRecordData = {
                    profile_id: profile.id,
                    med_name: entry.querySelector('.med-name').value,
                    dosage: entry.querySelector('.dosage').value,
                    start_date: entry.querySelector('.start-date').value,
                    end_date: entry.querySelector('.end-date').value
                };

                const { data: medRecord, error: medError } = await _supabase
                    .from('medications')
                    .insert([medRecordData])
                    .select()
                    .single();

                if (medError) throw medError;

                // Step 3: Handle Times
                const timeInputs = entry.querySelectorAll('.reminder-time');
                const reminderRows = Array.from(timeInputs).map(t => ({
                    medication_id: medRecord.id,
                    reminder_time: t.value
                }));

                const { error: timeError } = await _supabase
                    .from('reminders')
                    .insert(reminderRows);

                if (timeError) throw timeError;
            }

            // Success UI
            document.getElementById('formWrapper').style.display = 'none';
            document.getElementById('successMessage').style.display = 'block';

        } catch (err) {
            console.error("Submission failed:", err);
            alert("Error saving record: " + err.message);
            submitBtn.disabled = false;
            submitBtn.innerText = "Submit Record";
        }
    });
} else {
    console.error("Could not find the medicationForm element!");
}