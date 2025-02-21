import pickle
import time
import numpy as np

class SignLanguageLabels:
    def __init__(self, min_time_between_changes=2):
        self.model_dict = pickle.load(open('C:/Users/admin/Desktop/sign-language-detector-python-Copy/model.p', 'rb'))
        self.model = self.model_dict['model']
        self.labels_dict = {0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F', 6: 'G', 7: 'H', 8: 'I', 9: 'J', 10: 'K', 11: 'L', 12: 'M', 13: 'N', 14: 'O', 15: 'P', 16: 'Q', 17: 'R', 18: 'S', 19: 'T', 20: 'U', 21: 'V', 22: 'W', 23: 'X', 24: 'Y', 25: 'Z', 26: ' '}
        self.last_prediction = None
        self.last_prediction_time = None
        self.current_stable_label = None
        self.min_time_between_changes = min_time_between_changes
        self.n_features = self.model_dict.get('n_features', 42)  # Default to 42 if not specified
        
    def normalize_input(self, data):
        """Normalize input data to match the expected number of features"""
        data_array = np.array(data)
        if len(data_array) > self.n_features:
            return data_array[:self.n_features]
        elif len(data_array) < self.n_features:
            return np.pad(data_array, (0, self.n_features - len(data_array)), 'constant')
        return data_array
        
    def get_labels_list(self):
        """Returns a list of all available sign language characters"""
        return list(self.labels_dict.values())
    
    def get_labels_string(self):
        """Returns a string of all available sign language characters"""
        return ', '.join(self.get_labels_list())
    
    def process_prediction(self, prediction_idx):
        """
        Process the prediction and only return the last label before a change
        Returns: tuple (predicted_character, is_change)
        """
        try:
            current_prediction = self.labels_dict[int(prediction_idx)]
        except KeyError:
            print(f"Warning: Got prediction index {prediction_idx} but valid indices are {sorted(self.labels_dict.keys())}")
            return None, False
        current_time = time.time()
        
        # Initialize if this is the first prediction
        if self.last_prediction is None:
            self.last_prediction = current_prediction
            self.last_prediction_time = current_time
            self.current_stable_label = current_prediction
            return current_prediction, False
            
        # If prediction has changed
        if current_prediction != self.last_prediction:
            time_since_last_change = current_time - self.last_prediction_time
            
            if time_since_last_change >= self.min_time_between_changes:
                last_label = self.last_prediction
                self.last_prediction = current_prediction
                self.last_prediction_time = current_time
                self.current_stable_label = current_prediction
                return last_label, True
                
        self.last_prediction = current_prediction
        return current_prediction, False 